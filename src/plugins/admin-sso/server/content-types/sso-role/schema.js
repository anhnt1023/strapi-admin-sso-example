export default {
  kind: "collectionType",
  collectionName: "sso-roles",
  info: {
    singularName: "roles",
    pluralName: "sso-roles",
    displayName: "sso-role",
    description: "",
  },
  options: {
    draftAndPublish: true,
  },
  pluginOptions: {
    "content-manager": {
      visible: false,
    },
    "content-type-builder": {
      visible: false,
    },
  },
  attributes: {
    oauth_type: {
      type: "string",
      configurable: false,
      required: true,
    },
    roles: {
      type: "json",
      configurable: false,
    },
  },
};
