import app from "./app";
import { env } from "./config/env";
import { connectMongo } from "./config/mongo";

/**
 * Start Server
 */
const startServer = async () => {
  await connectMongo();

  app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
  });
};

startServer();
