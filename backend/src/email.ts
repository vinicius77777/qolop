import dotenv from "dotenv";
import nodemailer from "nodemailer";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: emailUser,
    pass: emailPass,
  },
});

function ensureEmailConfig() {
  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER ou EMAIL_PASS não configurados no ambiente");
  }
}

function deriveNomeCliente(email: string, nome?: string | null) {
  const nomeDerivadoDoEmail = email
    .split("@")[0]
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return nome?.trim() && nome.trim().toLowerCase() !== "cliente"
    ? nome.trim()
    : nomeDerivadoDoEmail;
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function buildPedidoCompletoEmail(params: {
  email: string;
  nome?: string | null;
  pedidoId: number;
  empresaNome?: string | null;
  concluidoEm?: Date;
}) {
  const nomeCliente = deriveNomeCliente(params.email, params.nome);
  const concluidoEm = params.concluidoEm ?? new Date();
  const empresaNome = params.empresaNome?.trim() || "Qolop";

  return {
    subject: `Confirmação de conclusão do pedido #${params.pedidoId}`,
    html: `
      <div style="margin:0;padding:32px 16px;background-color:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(15,23,42,0.08);">
          <div style="background:linear-gradient(135deg,#0f172a,#1e3a8a);padding:28px 32px;">
            <h1 style="margin:0;font-size:24px;line-height:1.3;color:#ffffff;">Qolop</h1>
            <p style="margin:8px 0 0;font-size:14px;color:rgba(255,255,255,0.82);">
              Atualização do status do seu pedido
            </p>
          </div>

          <div style="padding:32px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Prezado(a) <strong>${nomeCliente}</strong>,
            </p>

            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Informamos que o seu pedido foi concluído com sucesso em nossa plataforma.
            </p>

            <div style="padding:18px 20px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin:0 0 20px;">
              <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#475569;">
                <strong>Número do pedido:</strong> #${params.pedidoId}
              </p>
              <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#475569;">
                <strong>Data da conclusão:</strong> ${formatDateTime(concluidoEm)}
              </p>
              <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                <strong>Responsável:</strong> ${empresaNome}
              </p>
            </div>

            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">
              Caso necessário, nossa equipe poderá entrar em contato para alinhar os próximos passos
              ou fornecer informações complementares.
            </p>

            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;">
              Agradecemos pela confiança em nossos serviços.
            </p>

            <div style="padding:18px 20px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;">
              <p style="margin:0;font-size:14px;line-height:1.7;color:#475569;">
                Esta é uma mensagem automática de confirmação enviada pela <strong>Qolop</strong>.
              </p>
            </div>

            <p style="margin:24px 0 0;font-size:16px;line-height:1.7;">
              Atenciosamente,<br />
              <strong>Equipe QOLOP</strong>
            </p>
          </div>
        </div>
      </div>
    `,
  };
}

export async function initializeEmailTransport() {
  ensureEmailConfig();
  await transporter.verify();
}

export async function sendPedidoCompleto(params: {
  email: string;
  nome?: string | null;
  pedidoId: number;
  empresaNome?: string | null;
  concluidoEm?: Date;
}) {
  ensureEmailConfig();

  const content = buildPedidoCompletoEmail(params);

  await transporter.sendMail({
    from: `"Qolop" <${emailUser}>`,
    to: params.email,
    subject: content.subject,
    html: content.html,
  });
}
