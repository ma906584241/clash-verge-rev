use super::{CmdResult, CommandFailure, WithErrorCode as _, proxy_aware_coded_error, proxy_aware_error};
use crate::core::notify::NoticeStatus;
use crate::feat;
use crate::utils::{dirs, yaml_emitter};
use crate::{
    cmd::StringifyErr as _,
    config::{CraftInfo, Config, profiles::profiles_save_file_safe},
    constants,
    core::{
        CoreManager, handle,
        validate::{CoreConfigValidator, ValidationOutcome},
    },
};
use craft_verge_logging::{Type, logging, logging_error};
use smartstring::alias::String;
use tokio::fs;

#[tauri::command]
#[specta::specta]
pub async fn copy_craft_env() -> CmdResult {
    feat::copy_craft_env().await.stringify_err()
}

#[tauri::command]
#[specta::specta]
pub async fn get_craft_info() -> CmdResult<CraftInfo> {
    Ok(Config::craft().await.data_arc().get_client_info())
}

#[tauri::command]
#[specta::specta]
pub async fn patch_craft_config(payload: crate::ipc::YamlMapping) -> CmdResult {
    feat::patch_craft(&payload.0)
        .await
        .map_err(|error| proxy_aware_coded_error(&error, "CRAFT_CONFIG_UPDATE_FAILED"))
}

#[tauri::command]
#[specta::specta]
pub async fn patch_craft_mode(payload: std::string::String) -> CmdResult {
    let payload: String = payload.into();
    feat::change_craft_mode(payload)
        .await
        .with_error_code("CRAFT_MODE_UPDATE_FAILED")
}

/// Reads the saved mode without depending on strict mihomo `/configs` deserialization.
#[tauri::command]
#[specta::specta]
pub async fn get_craft_mode() -> CmdResult<Option<std::string::String>> {
    Ok(Config::craft().await.data_arc().get_mode())
}

#[tauri::command]
#[specta::specta]
pub async fn change_craft_core(craft_core: std::string::String) -> CmdResult<Option<CommandFailure>> {
    let craft_core: String = craft_core.into();
    logging!(info, Type::Config, "changing core to {craft_core}");

    match CoreManager::global().change_core(&craft_core).await {
        Ok(_) => {
            logging_error!(Type::Core, profiles_save_file_safe().await);

            match CoreManager::global().restart_core().await {
                Ok(_) => {
                    handle::Handle::notice(NoticeStatus::ConfigCoreChangeSuccess, craft_core.as_str());
                    handle::Handle::refresh_craft();
                    Ok(None)
                }
                Err(err) => {
                    let failed = err.context("core changed but failed to restart");
                    let error_msg: String = format!("{failed:#}").into();
                    handle::Handle::notice(NoticeStatus::ConfigCoreChangeError, error_msg.as_str());
                    logging!(error, Type::Core, "core changed but failed to restart: {error_msg}");
                    Ok(Some(proxy_aware_coded_error(&failed, "CORE_CHANGE_FAILED")))
                }
            }
        }
        Err(err) => {
            let error_msg: String = format!("{err:#}").into();
            logging!(error, Type::Core, "failed to change core: {error_msg}");
            handle::Handle::notice(NoticeStatus::ConfigCoreChangeError, error_msg.as_str());
            Ok(Some(proxy_aware_coded_error(&err, "CORE_CHANGE_FAILED")))
        }
    }
}

#[tauri::command]
#[specta::specta]
pub async fn restart_core() -> CmdResult {
    logging_error!(Type::Core, profiles_save_file_safe().await);
    let result = CoreManager::global()
        .restart_core()
        .await
        .map_err(|error| proxy_aware_coded_error(&error, "CORE_RESTART_FAILED"));
    if result.is_ok() {
        handle::Handle::refresh_craft();
    }
    result
}

/// Replaces the managed core binary atomically instead of letting mihomo overwrite itself.
#[tauri::command]
#[specta::specta]
pub async fn upgrade_craft_core(force: bool) -> CmdResult<feat::CoreUpgradeReport> {
    let report = feat::upgrade_core(force).await.with_error_code("CORE_UPGRADE_FAILED")?;
    if report.upgraded {
        handle::Handle::refresh_craft();
    }
    Ok(report)
}

#[tauri::command]
#[specta::specta]
pub async fn test_delay(url: std::string::String) -> CmdResult<u32> {
    let url: String = url.into();
    let result = match feat::test_delay(url).await {
        Ok(delay) => delay,
        Err(e) => {
            logging!(error, Type::Cmd, "get craft delay failed: {e:#}");
            10000u32
        }
    };
    Ok(result)
}

#[tauri::command]
#[specta::specta]
pub async fn save_dns_config(dns_config: crate::ipc::YamlMapping) -> CmdResult {
    use crate::utils::dirs;
    use tokio::fs;

    let dns_path = dirs::app_home_dir().stringify_err()?.join(constants::files::DNS_CONFIG);

    let yaml_str = yaml_emitter::to_mihomo_config_string(&dns_config.0).stringify_err()?;
    fs::write(&dns_path, yaml_str).await.stringify_err()?;
    logging!(info, Type::Config, "DNS config saved to {dns_path:?}");

    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn take_dns_override_notice() -> bool {
    crate::config::dns::take_dns_override_notice()
}

#[tauri::command]
#[specta::specta]
pub async fn set_dns_override(
    profile_uid: std::string::String,
    enabled: bool,
    confirmation: Option<std::string::String>,
) -> CmdResult<feat::DnsOverrideOutcome> {
    let profile_uid: String = profile_uid.into();
    let confirmation = confirmation.map(String::from);
    feat::set_dns_override(profile_uid, enabled, confirmation)
        .await
        .map_err(|error| proxy_aware_coded_error(&error, "DNS_OVERRIDE_UPDATE_FAILED"))
}

#[tauri::command]
#[specta::specta]
pub async fn apply_dns_config(apply: bool) -> CmdResult {
    if apply {
        let dns_path = dirs::app_home_dir().stringify_err()?.join(constants::files::DNS_CONFIG);

        if !dns_path.exists() {
            logging!(warn, Type::Config, "DNS config file not found: {}", dns_path.display());
            return Err("DNS config file not found".into());
        }

        let dns_yaml = fs::read_to_string(&dns_path).await.stringify_err_log(|e| {
            logging!(
                error,
                Type::Config,
                "Failed to read DNS config {}: {e}",
                dns_path.display()
            );
        })?;

        serde_yaml_ng::from_str::<serde_yaml_ng::Mapping>(&dns_yaml).stringify_err_log(|e| {
            logging!(
                error,
                Type::Config,
                "Failed to parse DNS config {}: {e}",
                dns_path.display()
            );
        })?;

        CoreManager::global().update_config_checked().await.map_err(|error| {
            logging!(error, Type::Config, "failed to apply the config with DNS: {error:#}");
            proxy_aware_error(&error)
        })?;

        logging!(info, Type::Config, "DNS config successfully applied");
    } else {
        logging!(info, Type::Config, "DNS settings disabled, regenerating config");

        CoreManager::global().update_config_checked().await.map_err(|error| {
            logging!(error, Type::Config, "failed to apply the regenerated config: {error:#}");
            proxy_aware_error(&error)
        })?;

        logging!(info, Type::Config, "Config regenerated successfully");
    }

    handle::Handle::refresh_craft();
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub async fn get_dns_config_content() -> CmdResult<Option<std::string::String>> {
    use crate::utils::dirs;
    use tokio::fs;

    let dns_path = dirs::app_home_dir().stringify_err()?.join(constants::files::DNS_CONFIG);

    match fs::read_to_string(&dns_path).await {
        Ok(content) => Ok(Some(content)),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(CommandFailure::plain(error)),
    }
}

#[tauri::command]
#[specta::specta]
pub async fn validate_dns_config() -> CmdResult<ValidationOutcome> {
    let app_dir = dirs::app_home_dir().stringify_err()?;
    let dns_path = app_dir.join(constants::files::DNS_CONFIG);
    let dns_path_str = dns_path.to_str().unwrap_or_default();

    if !dns_path.exists() {
        return Ok(ValidationOutcome::invalid_from_message("DNS config file not found"));
    }

    // A fragment, not a runnable config; the merged result is validated on apply.
    CoreConfigValidator::validate_config_file_outcome(dns_path_str, Some(true))
        .await
        .stringify_err()
}

#[tauri::command]
#[specta::specta]
pub async fn get_craft_logs() -> CmdResult<Vec<std::string::String>> {
    let logs = CoreManager::global().get_craft_logs().await.unwrap_or_default();
    Ok(logs)
}
