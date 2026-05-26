import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Plus, BarChart3, List, Fuel, LogOut } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="p-4 bg-emerald-500/10 rounded-2xl">
                <Fuel className="w-12 h-12 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white">AbastecimentoApp</h1>
            <p className="text-slate-300 text-lg">
              Controle inteligente de abastecimentos de veiculos
            </p>
          </div>

          <div className="space-y-4 pt-8">
            <div className="space-y-2 text-left">
              <h2 className="text-white font-semibold text-sm uppercase tracking-wide">
                Recursos
              </h2>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Registre abastecimentos com fotos de cupons
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Acompanhe consumo medio e gastos
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Exporte dados em CSV e JSON
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  Sincronize em qualquer dispositivo
                </li>
              </ul>
            </div>
          </div>

          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 text-lg rounded-lg transition-all hover:shadow-lg"
          >
            Entrar com Manus
          </Button>

          <p className="text-slate-400 text-xs">
            Seus dados sao protegidos e sincronizados com seguranca
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Fuel className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">AbastecimentoApp</h1>
              <p className="text-xs text-slate-500">Bem-vindo, {user?.name}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card
            onClick={() => (window.location.href = "/new")}
            className="p-6 border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors">
                <Plus className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Novo Abastecimento</h3>
            <p className="text-sm text-slate-600">Registre um novo abastecimento com foto do cupom</p>
          </Card>

          <Card
            onClick={() => (window.location.href = "/refuelings")}
            className="p-6 border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <List className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Abastecimentos</h3>
            <p className="text-sm text-slate-600">Visualize todos os seus abastecimentos registrados</p>
          </Card>

          <Card
            onClick={() => (window.location.href = "/dashboard")}
            className="p-6 border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 cursor-pointer transition-all group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Dashboard</h3>
            <p className="text-sm text-slate-600">Analise gastos, consumo e exporte seus dados</p>
          </Card>
        </div>

        <Card className="p-8 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
          <h2 className="text-2xl font-bold text-emerald-900 mb-3">Comece agora</h2>
          <p className="text-emerald-800 mb-6">
            Clique em "Novo Abastecimento" para registrar seu primeiro abastecimento. Tire uma foto do cupom fiscal
            e deixe o app calcular automaticamente seus gastos e consumo.
          </p>
          <Button
            onClick={() => (window.location.href = "/new")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Abastecimento
          </Button>
        </Card>
      </div>
    </div>
  );
}
