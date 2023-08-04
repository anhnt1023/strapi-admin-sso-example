export default [
  {
    method: "GET",
    path: "/keycloak/login",
    handler: "keycloak.login",
    config: {
      policies: [],
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/keycloak/callback",
    handler: "keycloak.loginCallback",
    config: {
      auth: false,
    },
  },
  {
    method: "GET",
    path: "/sso-roles",
    handler: "role.find",
  },
  {
    method: "PUT",
    path: "/sso-roles",
    handler: "role.update",
  },
];
