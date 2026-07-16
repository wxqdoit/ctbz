import { createAppKit } from "@reown/appkit/react";
import type { AppKitNetwork } from "@reown/appkit/networks";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { QueryClient } from "@tanstack/react-query";
import { filecoinCalibration, xLayer } from "viem/chains";

export const REOWN_PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID || "f473659ce4e03687a6e3f32e8042f7c8";
export const X_LAYER_CHAIN_ID = xLayer.id;
export const FILECOIN_CALIBRATION_CHAIN_ID = filecoinCalibration.id;

const networks = [xLayer, filecoinCalibration] as [AppKitNetwork, ...AppKitNetwork[]];

export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId: REOWN_PROJECT_ID,
});

export const queryClient = new QueryClient();

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId: REOWN_PROJECT_ID,
  metadata: {
    name: "草台班子 A2MCP",
    description: "草台班子 A2MCP 管理后台支付测试",
    url: "https://ctbz.lol",
    icons: ["https://ctbz.lol/favicon.png"],
  },
  features: {
    analytics: false,
  },
});
