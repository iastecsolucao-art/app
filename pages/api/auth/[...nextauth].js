import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credenciais",
      credentials: {
        email: { label: "Email", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        try {
          const result = await pool.query(
            "SELECT * FROM usuarios WHERE email=$1",
            [credentials.email]
          );

          if (result.rows.length === 0) {
            console.log(`Usuário não encontrado para email: ${credentials.email}`);
            return null;
          }

          const u = result.rows[0];
//          console.log("Dados do usuário encontrado na authorize:", u);

          if (
            (u.role === "trial" && credentials.senha === "trial") ||
            (u.senha && credentials.senha === u.senha)
          ) {
            const user = {
              id: u.id,
              name: u.nome,
              email: u.email,
              role: u.role,
              expiracao: u.expiracao,
              empresa_id: u.empresa_id,
            };
            console.log("Usuário autorizado:", user);
            return user;
          }

          console.log("Senha inválida para usuário:", credentials.email);
          return null;
        } catch (err) {
          console.error("Erro no login credenciais:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
//      console.log("signIn callback - user:", user);
  //    console.log("signIn callback - account:", account);

      if (account.provider === "google") {
        const client = await pool.connect();
        try {
          const res = await client.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [user.email]
          );

          if (res.rows.length === 0) {
  //          console.log("Criando novo usuário Google:", user.email);
            await client.query(
              `INSERT INTO usuarios (nome, email, google_id, role, expiracao, empresa_id)
               VALUES ($1, $2, $3, 'user', NOW() + interval '10 days', 1)`,
              [user.name, user.email, user.id]
            );
            user.empresa_id = 1;
          } else {
//            console.log("Usuário Google existente encontrado:", user.email);
            await client.query(
              `UPDATE usuarios
               SET google_id = $1,
                   nome = $2,
                   expiracao = NOW() + interval '10 days'
               WHERE email = $3`,
              [user.id, user.name, user.email]
            );
            user.empresa_id = res.rows[0].empresa_id;
          }
        } finally {
          client.release();
        }
      }
      // Retorna o user atualizado para o jwt callback
      return true;
    },

    async jwt({ token, user, account }) {
      // No login inicial, user estará definido
      if (user) {
//        console.log("jwt callback - user inicial:", user);
        token.id = user.id;
        token.role = user.role;
        token.expiracao = user.expiracao;
        token.empresa_id = user.empresa_id;
      } else if (!token.empresa_id && token.email) {
        // Em requisições subsequentes, busca empresa_id pelo email
        const client = await pool.connect();
        try {
          const res = await client.query(
            "SELECT empresa_id FROM usuarios WHERE email = $1",
            [token.email]
          );
          if (res.rows.length > 0) {
            token.empresa_id = res.rows[0].empresa_id;
  //          console.log("jwt callback - empresa_id buscado pelo email:", token.empresa_id);
          }
        } catch (err) {
          console.error("Erro ao buscar empresa_id no jwt callback:", err);
        } finally {
          client.release();
        }
      }
      return token;
    },

    async session({ session, token }) {
//      console.log("session callback - token recebido:", token);
      session.user.id = token.id;
      session.user.role = token.role || "user";
      session.user.expiracao = token.expiracao;
      session.user.empresa_id = token.empresa_id;

      const client = await pool.connect();
      try {
        const res = await client.query(
          "SELECT nome FROM empresa WHERE id = $1",
          [token.empresa_id]
        );
        session.user.empresa_nome = res.rows.length > 0 ? res.rows[0].nome : "Trial";
      //  console.log("session callback - empresa encontrada:", session.user.empresa_nome);
      } catch (err) {
        console.error("Erro ao buscar nome da empresa:", err);
        session.user.empresa_nome = "Trial";
      } finally {
        client.release();
      }

//      console.log("session callback - sessão final:", session);
      return session;
    },
  },

  session: {
    strategy: "jwt",
  },

  debug: process.env.NODE_ENV === "development",
};

export default NextAuth(authOptions);