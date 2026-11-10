# CraftVPN

CraftVPN is a modified version of [clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev). The modification date is **2026-11-10**. This repository stays under **GPL-3.0**. The upstream [LICENSE](../LICENSE) and the original copyright notices in the source are kept. See [NOTICE](../NOTICE).

CraftVPN is **not** an official Clash Verge, Clash Verge Rev, or clash-verge-rev release, and it is not affiliated with those projects. It is also not the Android app named Craft VPN from TrafCraft LLC.

Source and notes for this fork: <https://github.com/ma906584241/clash-verge-rev>

## What it is

CraftVPN is a desktop proxy client built with Tauri. On Windows the product name, window title, tray tooltip, and installer name are **CraftVPN**. The application id is `io.github.ma906584241.craftvpn`. The deep-link scheme is `craftvpn://`.

The proxy core is open-source [mihomo](https://github.com/MetaCubeX/mihomo) (Clash Meta). The product name does not include mihomo.

The icons are original placeholders and can be replaced later. They are not Clash Verge artwork.

## Updates

In-app updates are off. The app does not contact Clash Verge update servers and does not use the upstream signing key. This change does not publish a GitHub Release or attach installers. Build from source when you need a package.

## Service

The privileged service binary still uses the upstream open-source file name (`clash-verge-service`). The interface calls it the CraftVPN service. Windows may ask for administrator approval when that service is installed or repaired.

## Features

- Rust and Tauri 2
- Open-source mihomo core, including an alpha core switch
- Profiles, merge, and scripts
- System proxy and TUN
- Node and rule editing

## Development

See [CONTRIBUTING.md](../CONTRIBUTING.md).

```shell
pnpm i
pnpm run prebuild
pnpm dev
```

## Upstream

- [clash-verge-rev/clash-verge-rev](https://github.com/clash-verge-rev/clash-verge-rev)
- [zzzgydi/clash-verge](https://github.com/zzzgydi/clash-verge)
- [MetaCubeX/mihomo](https://github.com/MetaCubeX/mihomo)
- [tauri-apps/tauri](https://github.com/tauri-apps/tauri)

## Privacy

CraftVPN does not collect user data. Configuration and logs stay on the device. See the [Privacy Policy](../PRIVACY.md).

## License

GNU General Public License v3.0. See [LICENSE](../LICENSE).
