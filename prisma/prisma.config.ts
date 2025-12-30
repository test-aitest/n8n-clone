import path from "node:path";

const config = {
  schema: path.join(__dirname, "schema.prisma"),

  migrate: {
    async url() {
      return process.env.DATABASE_URL ?? "";
    },
  },
};

export default config;
