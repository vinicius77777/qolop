import test from "node:test";
import assert from "node:assert/strict";
import { normalizePedidoQueryFilters } from "../src/utils/pedidoDomain";

test("normalizePedidoQueryFilters não aplica filtro de pagamento quando nenhum parâmetro é enviado", () => {
  const filters = normalizePedidoQueryFilters({});

  assert.equal(filters.pagamentoStatus, undefined);
});

test("normalizePedidoQueryFilters não aplica filtro de pagamento quando os parâmetros estão vazios", () => {
  const filters = normalizePedidoQueryFilters({
    pagamentoStatus: "",
    paymentStatus: null,
    pago: undefined,
    paid: "",
  });

  assert.equal(filters.pagamentoStatus, undefined);
});

test("normalizePedidoQueryFilters aplica filtro de pagamento quando o parâmetro está presente", () => {
  const filters = normalizePedidoQueryFilters({ pagamentoStatus: "pago" });

  assert.equal(filters.pagamentoStatus, "pago");
});

test("normalizePedidoQueryFilters normaliza aliases e respeita prioridade dos parâmetros", () => {
  const filters = normalizePedidoQueryFilters({
    pagamentoStatus: "pago a mais",
    paid: "pago",
  });

  assert.equal(filters.pagamentoStatus, "pago_a_mais");
});

test("normalizePedidoQueryFilters mantém busca, status e empresaId", () => {
  const filters = normalizePedidoQueryFilters({
    search: "  Maria  ",
    q: undefined,
    status: "pendente",
    empresaId: "7",
    companyId: undefined,
  });

  assert.equal(filters.search, "Maria");
  assert.equal(filters.status, "novo");
  assert.equal(filters.empresaId, 7);
});
