"use client";

import { useState, useEffect } from "react";
import {
  WhopElementsProvider,
  BalanceElement,
  WithdrawButtonElement,
  StatusBannerElement,
} from "@whop/embedded-components-react-js";

/**
 * Página de prueba para el sandbox de Whop
 * Aquí puedes probar los componentes de payout con dinero falso
 */
export default function TestWhopSandbox() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modo: sandbox para pruebas, production para real
  const environment = "sandbox";

  const getAccessToken = async () => {
    setLoading(true);
    setError(null);

    try {
      // Para pruebas, usamos un token de prueba
      // En producción, esto vendría del endpoint /api/whop/payout-session
      const response = await fetch("/api/whop/payout-session", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al obtener sesión");
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Test Whop Sandbox</h1>
        <p className="text-gray-400 mb-8">
          Ambiente: <span className="text-yellow-400 font-mono">{environment}</span>
        </p>

        {!accessToken ? (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Paso 1: Obtener Token de Acceso</h2>
            <p className="text-gray-400 mb-4">
              Necesitas estar logueado y tener una cuenta de Whop configurada.
            </p>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            <button
              onClick={getAccessToken}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
            >
              {loading ? "Obteniendo..." : "Obtener Token de Prueba"}
            </button>

            <div className="mt-6 p-4 bg-gray-700/50 rounded-lg">
              <h3 className="font-medium mb-2">Para probar manualmente:</h3>
              <p className="text-sm text-gray-400">
                Si no tienes cuenta configurada, puedes probar con un token de prueba
                desde el dashboard de Whop.
              </p>
            </div>
          </div>
        ) : (
          <WhopElementsProvider
            accessToken={accessToken}
            environment={environment}
          >
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Balance (Sandbox)</h2>
                <BalanceElement />
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Estado de Cuenta</h2>
                <StatusBannerElement />
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Acciones</h2>
                <div className="flex gap-4">
                  <WithdrawButtonElement />
                </div>
              </div>

              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <p className="text-green-400">
                  ✅ Ambiente Sandbox activo - Todo el dinero es falso
                </p>
              </div>
            </div>
          </WhopElementsProvider>
        )}
      </div>
    </div>
  );
}
