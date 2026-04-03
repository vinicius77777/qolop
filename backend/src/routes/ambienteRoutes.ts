import { Router } from "express";
import {
  createAmbiente,
  deleteAmbiente,
  getAmbienteById,
  listAdminAmbientes,
  listEmpresaAmbientes,
  listExplorerAmbientes,
  listPublicAmbientes,
  registerAmbienteView,
  updateAmbiente,
  uploadAmbienteImagem,
} from "../controllers/ambienteController";
import { auth, requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 30;
const geocodeCache = new Map<string, { expiresAt: number; data: unknown }>();

router.get("/geocode/search", async (req, res) => {
  try {
    const query = new URLSearchParams();

    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null && String(item).trim()) {
            query.append(key, String(item));
          }
        });
        return;
      }

      if (value !== undefined && value !== null && String(value).trim()) {
        query.set(key, String(value));
      }
    });

    if (!query.get("format")) {
      query.set("format", "jsonv2");
    }

    if (!query.get("addressdetails")) {
      query.set("addressdetails", "1");
    }

    if (!query.get("limit")) {
      query.set("limit", "5");
    }

    if (!query.get("dedupe")) {
      query.set("dedupe", "1");
    }

    const normalizedCountry = (query.get("country") || query.get("pais") || "").trim().toLowerCase();
    const queryText = (query.get("q") || "").trim().toLowerCase();
    const shouldBiasBrazil =
      normalizedCountry === "brasil" ||
      normalizedCountry === "brazil" ||
      queryText.includes("brasil") ||
      queryText.includes("brazil");

    if (shouldBiasBrazil) {
      query.set("countrycodes", "br");
      query.set("bounded", "1");
      query.set("viewbox", "-73.99,-33.75,-34.79,5.27");
    }

    const cacheKey = query.toString();
    const cached = geocodeCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    if (cached) {
      geocodeCache.delete(cacheKey);
    }

    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "qolop-local-geocoder/1.0",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Falha ao consultar o serviço de geocodificação.",
      });
    }

    const data = await response.json();

    geocodeCache.set(cacheKey, {
      expiresAt: Date.now() + GEOCODE_CACHE_TTL_MS,
      data,
    });

    return res.json(data);
  } catch (error) {
    console.error("[GEOCODE_SEARCH_ERROR]", error);
    return res.status(500).json({
      error: "Erro ao consultar o serviço de geocodificação.",
    });
  }
});

router.get("/ambientes", listPublicAmbientes);
router.get("/admin/ambientes", auth, requireAdmin, listAdminAmbientes);
router.get("/empresa/ambientes", auth, requireAuth, listEmpresaAmbientes);
router.post("/ambientes", auth, requireAuth, uploadAmbienteImagem.single("imagem"), createAmbiente);
router.put("/ambientes/:id", auth, requireAuth, uploadAmbienteImagem.single("imagem"), updateAmbiente);
router.delete("/ambientes/:id", auth, requireAuth, deleteAmbiente);
router.get("/ambientes/:id", getAmbienteById);
router.post("/ambientes/:id/view", registerAmbienteView);
router.get("/explorer", listExplorerAmbientes);

export default router;
