import app, { getApp } from "../server/index";

export default async function handler(req: any, res: any) {
  await getApp();
  return app(req, res);
}
