"use client";

import { useState, useEffect } from "react";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawButtonElement,
  StatusBannerElement,
  AddPayoutMethodElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import type { WhopElements } from "@whop/embedded-components-vanilla-js/types";

/**
 * Página de prueba para el sandbox de Whop
 * NO requiere login - usa el company ID de Octopus directamente
 */
export default function TestWhopSandbox() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [whopElements, setWhopElements] = useState<WhopElements | null>(null);

  // Cargar WhopElements y token automáticamente
  useEffect(() => {
    // Cargar WhopElements con environment sandbox
    loadWhopElements({
      environment: "sandbox",
      appearance: {
        theme: {
          appearance: "dark",
          accentColor: "blue",
        },
      },
    }).then((elements) => {
      setWhopElements(elements);
    });

    // Obtener token de prueba automáticamente
    fetch("/api/whop/test-token", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAccessToken(data.accessToken);
          setCompanyId(data.companyId);
        } else {
          setError(data.error || "Error al obtener token");
        }
      })
      .catch((err) => {
        setError(err.message || "Error de conexión");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading || !whopElements) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Cargando Whop Sandbox...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Test Whop Sandbox</h1>
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Error</h2>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!accessToken || !companyId) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Test Whop Sandbox</h1>
          <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-6">
            <p className="text-yellow-300">No se pudo obtener el token. Verifica la configuración de Whop.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Test Whop Sandbox</h1>
        <p className="text-gray-400 mb-2">
          Ambiente: <span className="text-yellow-400 font-mono">sandbox</span>
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Company ID: <span className="font-mono">{companyId}</span>
        </p>

        <Elements elements={whopElements}>
          <PayoutsSession
            token={accessToken}
            companyId={companyId}
            redirectUrl={typeof window !== 'undefined' ? window.location.href : ''}
          >
            <div className="space-y-6">
              {/* Balance */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Balance</h2>
                <BalanceElement />
              </div>

              {/* Estado de Cuenta */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Estado de Cuenta</h2>
                <StatusBannerElement />
              </div>

              {/* Métodos de Pago */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Agregar Método de Retiro</h2>
                <AddPayoutMethodElement />
              </div>

              {/* Botón de Retiro */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Retirar Fondos</h2>
                <WithdrawButtonElement />
              </div>

              {/* Indicador Sandbox */}
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-4">
                <p className="text-green-400 text-center">
                  🧪 Ambiente Sandbox - Todo el dinero es falso
                </p>
              </div>
            </div>
          </PayoutsSession>
        </Elements>
      </div>
    </div>
  );
}
