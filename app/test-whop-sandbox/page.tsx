"use client";

import { useState } from "react";

/**
 * Página de prueba COMPLETA para Whop
 * Permite probar todo el flujo de pagos
 */
export default function TestWhopSandbox() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCreatorId, setLastCreatorId] = useState<string | null>(null);

  // 1. Verificar conexión con Whop
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whop/test");
      const data = await res.json();
      setResults({ action: "Conexión", data });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // 2. Crear creador de prueba
  const createTestCreator = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whop/test-create-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Creador Prueba ${Date.now()}`,
          email: `test${Date.now()}@gmail.com`,
        }),
      });
      const data = await res.json();
      if (data.success && data.creator?.whop_company_id) {
        setLastCreatorId(data.creator.whop_company_id);
      }
      setResults({ action: "Crear Creador", data });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // 3. Ver balance de Octopus
  const getOctopusBalance = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whop/balance");
      const data = await res.json();
      setResults({ action: "Balance Octopus", data });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  // 4. Simular transferencia a creador
  const simulateTransfer = async () => {
    if (!lastCreatorId) {
      setError("Primero crea un creador de prueba (botón 2)");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/whop/test-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 100, // $100 de prueba
          creatorCompanyId: lastCreatorId,
        }),
      });
      const data = await res.json();
      setResults({ action: "Transferencia", data });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Test Whop - Panel de Pruebas</h1>
        <p className="text-yellow-400 mb-2">Ambiente: sandbox</p>
        {lastCreatorId && (
          <p className="text-green-400 text-sm mb-4">
            Último creador: <span className="font-mono">{lastCreatorId}</span>
          </p>
        )}

        {/* Acciones de Prueba */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 p-4 rounded-lg text-left"
          >
            <h3 className="font-bold text-lg">1. Verificar Conexión</h3>
            <p className="text-sm text-gray-300">Confirmar que Whop API funciona</p>
          </button>

          <button
            onClick={createTestCreator}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 p-4 rounded-lg text-left"
          >
            <h3 className="font-bold text-lg">2. Crear Creador de Prueba</h3>
            <p className="text-sm text-gray-300">Crear sub-company para un creador</p>
          </button>

          <button
            onClick={getOctopusBalance}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 p-4 rounded-lg text-left"
          >
            <h3 className="font-bold text-lg">3. Ver Balance Octopus</h3>
            <p className="text-sm text-gray-300">Ver fondos disponibles en la plataforma</p>
          </button>

          <button
            onClick={simulateTransfer}
            disabled={loading}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 p-4 rounded-lg text-left"
          >
            <h3 className="font-bold text-lg">4. Simular Transferencia</h3>
            <p className="text-sm text-gray-300">Transferir $100 a creador de prueba</p>
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-gray-800 rounded-lg p-6 mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <p>Procesando...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 mb-4">
            <h3 className="font-bold text-red-400 mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {/* Resultados */}
        {results && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4 text-green-400">
              Resultado: {results.action}
            </h3>
            <pre className="bg-gray-900 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(results.data, null, 2)}
            </pre>
          </div>
        )}

        {/* Info del Flujo */}
        <div className="mt-8 bg-gray-800/50 rounded-lg p-6">
          <h3 className="font-bold text-lg mb-4">Flujo de Pagos Octopus</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>1. <span className="text-white">Empresa paga</span> → Checkout (tarjeta, sin cuenta Whop)</p>
            <p>2. <span className="text-white">Dinero llega a Octopus</span> → Balance de la plataforma</p>
            <p>3. <span className="text-white">Octopus transfiere al creador</span> → Menos 4.7% comisión</p>
            <p>4. <span className="text-white">Creador ve su balance</span> → En su wallet de Octopus</p>
            <p>5. <span className="text-white">Creador retira</span> → A banco/PayPal/crypto (Whop cobra 2.7%+$0.30)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
