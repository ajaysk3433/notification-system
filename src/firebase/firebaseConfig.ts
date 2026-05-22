import myCredential from "../../schools2ai-firebase-adminsdk.json" with { type: "json" };

import { initializeApp, getApp, cert, type ServiceAccount, type App } from "firebase-admin/app";

let app: App;

try {
  app = getApp("notification-server");
} catch {
  app = initializeApp(
    {
      credential: cert(myCredential as ServiceAccount),
    },
    "notification-server"
  );
}

export default app;