# CraftVPN

CraftVPN 是 [clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev) 的修改版本，修改日期 **2026-11-10**。本仓库继续使用 **GPL-3.0**，并保留上游的 [LICENSE](./LICENSE) 与源代码中的原版权声明。详见 [NOTICE](./NOTICE)。

CraftVPN **不是** Clash Verge、Clash Verge Rev 或 clash-verge-rev 的官方版本，与这些项目没有隶属关系。它也不是 TrafCraft LLC 的 Android 应用 “Craft VPN”。

源码与说明只放在本仓库：<https://github.com/ma906584241/clash-verge-rev>

<p align="center">
  <a href="./docs/README_en.md">English</a> ·
  <a href="./docs/README_es.md">Español</a> ·
  <a href="./docs/README_fa.md">فارسی</a> ·
  <a href="./docs/README_ja.md">日本語</a> ·
  <a href="./docs/README_ko.md">한국어</a> ·
  <a href="./docs/README_pt.md">Português</a> ·
  <a href="./docs/README_ru.md">Русский</a> ·
  <a href="./README.md">简体中文</a>
</p>

## 这是什么

CraftVPN 是一个桌面代理客户端，基于 Tauri。Windows 安装后的产品名、窗口标题、托盘提示和安装包名称都是 **CraftVPN**。应用 ID 是 `io.github.ma906584241.craftvpn`。深链接协议是 `craftvpn://`。

它使用开源的 [mihomo](https://github.com/MetaCubeX/mihomo)（Clash Meta）内核。产品名称里不包含 mihomo。

当前图标是占位图，可以以后替换。它们不是 Clash Verge 的官方图形。

## 更新

应用内更新已关闭。程序不会访问 Clash Verge 的更新服务器，也不会使用上游的签名公钥。本仓库这次改动不发布 GitHub Release，也不附带安装包。需要的话请从源码自行构建。

## Service

Windows 上的特权服务组件仍使用上游开源服务程序的文件名（`clash-verge-service`）。界面里把它称为 CraftVPN 服务。安装或修复服务时，Windows 可能会要求管理员权限。

## 功能

- 基于 Rust 和 Tauri 2
- 开源 mihomo 内核，可切换 Alpha 内核
- 订阅配置、合并与脚本
- 系统代理与 TUN
- 节点和规则编辑

## 开发

见 [CONTRIBUTING.md](./CONTRIBUTING.md)。

```shell
pnpm i
pnpm run prebuild
pnpm dev
```

## 上游

- [clash-verge-rev/clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev)
- [zzzgydi/clash-verge](https://github.com/zzzgydi/clash-verge)
- [MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo)
- [tauri-apps/tauri](https://github.com/tauri-apps/tauri)

## 隐私

CraftVPN 不收集用户数据，配置和日志只保存在本机。见 [隐私政策](./PRIVACY.md)。

## 许可证

GNU General Public License v3.0。见 [LICENSE](./LICENSE)。
