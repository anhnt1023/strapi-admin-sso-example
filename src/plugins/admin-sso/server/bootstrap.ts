import { Strapi } from "@strapi/strapi";

export default async ({ strapi }: { strapi: Strapi }) => {
  // bootstrap phase
  const actions = [
    {
      section: "plugins",
      displayName: "Read",
      uid: "read",
      pluginName: "admin-sso",
    },
  ];
  await strapi.admin.services.permission.actionProvider.registerMany(actions);
};
