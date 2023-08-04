import { Strapi } from "@strapi/strapi";

export default ({ strapi }: { strapi: Strapi }) => ({
  SSO_TYPE_GOOGLE: "1",
  SSO_TYPE_COGNITO: "2",
  SSO_TYPE_AZUREAD: "3",
  SSO_TYPE_KC: "4",
  ssoRoles() {
    return [
      {
        oauth_type: this.SSO_TYPE_GOOGLE,
        name: "Google",
      },
      {
        oauth_type: this.SSO_TYPE_COGNITO,
        name: "Cognito",
      },
      {
        oauth_type: this.SSO_TYPE_AZUREAD,
        name: "AzureAD",
      },
      {
        oauth_type: this.SSO_TYPE_KC,
        name: "Keycloak",
      },
    ];
  },
  async googleRoles() {
    return await strapi.query("plugin::admin-sso.roles").findOne({
      oauth_type: this.SSO_TYPE_GOOGLE,
      where: {
        type: "public",
      },
    });
  },
  async keycloakRoles() {
    return await strapi.query("plugin::admin-sso.roles").findOne({
      oauth_type: this.SSO_TYPE_KC,
      where: {
        type: "public",
      },
    });
  },
  async cognitoRoles() {
    return await strapi.query("plugin::admin-sso.roles").findOne({
      oauth_type: this.SSO_TYPE_COGNITO,
      where: {
        type: "public",
      },
    });
  },
  async azureAdRoles() {
    return await strapi.query("plugin::admin-sso.roles").findOne({
      oauth_type: this.SSO_TYPE_AZUREAD,
      where: {
        type: "public",
      },
    });
  },
  async find() {
    return await strapi.query("plugin::admin-sso.roles").findMany({
      where: {
        type: "public",
      },
    });
  },
  async update(roles) {
    const query = strapi.query("plugin::admin-sso.roles");
    await Promise.all(
      roles.map((role) => {
        return query
          .findOne({ oauth_type: role["oauth_type"] })
          .then((ssoRole) => {
            if (ssoRole) {
              query.update({
                where: { oauth_type: role["oauth_type"] },
                data: { roles: role.role },
              });
            } else {
              query.create({
                data: {
                  oauth_type: role["oauth_type"],
                  roles: role.role,
                },
              });
            }
          });
      })
    );
  },
});
