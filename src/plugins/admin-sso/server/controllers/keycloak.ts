import { Strapi } from "@strapi/strapi";
import axios from "axios";
import { v4 } from "uuid";
import { getService } from "@strapi/admin/server/utils";

const OAUTH_ENDPOINT = "https://iam.toprate.io/auth";
const OAUTH_GRANT_TYPE = "authorization_code";

const generateKcBaseUrl = (realm: string) =>
  `${OAUTH_ENDPOINT}/realms/${realm}`;

const configValidation = () => {
  const config = strapi.config.get("plugin.admin-sso");
  if (
    config["KEYCLOAK_REALM"] &&
    config["KEYCLOAK_CLIENT_ID"] &&
    config["KEYCLOAK_CLIENT_SECRET"] &&
    config["KEYCLOAK_OAUTH_REDIRECT_URI"]
  ) {
    return config;
  }
  throw new Error("KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID are required");
};

const generateOauthUrl = (
  realm: string,
  clientId: string,
  redirectUri: string
) =>
  `${generateKcBaseUrl(
    realm
  )}/protocol/openid-connect/auth?client_id=${clientId}&response_type=code&&scope=profile&redirect_uri=${redirectUri}&state=${Math.random()
    .toString(16)
    .slice(2)}`;

async function kcSignIn(ctx) {
  const config = configValidation();
  console.log("config: ", config);
  const url = generateOauthUrl(
    config["KEYCLOAK_REALM"],
    config["KEYCLOAK_CLIENT_ID"],
    encodeURIComponent(config["KEYCLOAK_OAUTH_REDIRECT_URI"])
  );
  ctx.set("Location", url);
  return ctx.send({}, 302);
}

async function loginCallback(ctx) {
  const config = configValidation();
  const httpClient = axios.create();
  const tokenService = getService("token");
  const oauthService = strapi.plugin("admin-sso").service("oauth");
  const roleService = strapi.plugin("admin-sso").service("role");

  if (!ctx.query.code) {
    return ctx.send(oauthService.renderSignUpError(`code Not Found`));
  }

  const params = new URLSearchParams();
  params.append("code", ctx.query.code);
  params.append("client_id", config["KEYCLOAK_CLIENT_ID"]);
  params.append("client_secret", config["KEYCLOAK_CLIENT_SECRET"]);
  params.append("redirect_uri", config["KEYCLOAK_OAUTH_REDIRECT_URI"]);
  params.append("grant_type", OAUTH_GRANT_TYPE);

  try {
    // exchange access token
    const { access_token } = await httpClient
      .post<{ access_token: string }>(
        `${generateKcBaseUrl(
          config["KEYCLOAK_REALM"]
        )}/protocol/openid-connect/token`,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .then(({ data }) => data);

    // get user infos
    const userInfoEndpoint = `${generateKcBaseUrl(
      config["KEYCLOAK_REALM"]
    )}/protocol/openid-connect/userinfo`;

    const user = await httpClient
      .get<{ email: string; family_name: string; given_name: string }>(
        userInfoEndpoint,
        {
          headers: {
            Authorization: `Bearer ${access_token}`,
          },
        }
      )
      .then(({ data }) => data);

    // console.log("user: ", user);

    // get user token on strapi
    const userService = getService("user");
    const dbUser = await userService.findOneByEmail(user.email);
    let activateUser;
    let jwtToken;

    // console.log("dbUser: ", dbUser);

    // const roles = await roleService.ssoRoles();
    // console.log("roles: ", roles);

    if (dbUser) {
      // Already registered
      activateUser = dbUser;
      jwtToken = await tokenService.createJwtToken(dbUser);
    } else {
      // Register a new account
      // const kcRoles = await roleService.keycloakRoles();
      // const roles =
      //   kcRoles && kcRoles["roles"]
      //     ? kcRoles["roles"].map((role) => ({
      //         id: role,
      //       }))
      //     : [];
      const roles = ["1"];

      const defaultLocale = oauthService.localeFindByHeader(
        ctx.request.headers
      );
      activateUser = await oauthService.createUser(
        user.email,
        user.given_name,
        user.family_name,
        defaultLocale,
        roles
      );
      jwtToken = await tokenService.createJwtToken(activateUser);

      // Trigger webhook
      await oauthService.triggerWebHook(activateUser);
    }
    // Login Event Call
    oauthService.triggerSignInSuccess(activateUser);

    // Client-side authentication persistence and redirection
    const nonce = v4();
    const html = oauthService.renderSignUpSuccess(
      jwtToken,
      activateUser,
      nonce
    );
    ctx.set("Content-Security-Policy", `script-src 'nonce-${nonce}'`);
    ctx.send(html);
  } catch (e) {
    console.error(e);
    ctx.send(oauthService.renderSignUpError(e.message));
  }
}

export default ({ strapi }: { strapi: Strapi }) => ({
  login: kcSignIn,
  loginCallback,
});
