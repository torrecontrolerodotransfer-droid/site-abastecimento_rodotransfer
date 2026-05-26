import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, BarChart3, List, Fuel, LogOut, Lock, User } from "lucide-react";

export default function Home() {
  // Pegamos a função 'login' diretamente do seu hook nativo useAuth
  const { user, isAuthenticated, logout, login } = useAuth();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInternalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // Usando o login do seu próprio sistema que já sabe a rota certa!
      if (login) {
        await login(username, password);
      } else {
        // Caso o seu useAuth use um objeto diferente, tentamos a chamada direta mais segura:
        const response = await fetch("/api/trpc/auth.login,auth.getSession?batch=1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ "0": { json: { username, password } } })
        });
        
        if (response.ok) {
          window.location.reload();
        } else {
          setErrorMsg("Usuário ou senha incorretos.");
        }
      }
    } catch (err) {
      setErrorMsg("Erro ao realizar o acesso. Verifique as credenciais.");
    } {
      setLoading(false);
    }
  };

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
              Controle inteligente de abastecimentos de veículos
            </p>
          </div>

          <Card className="p-6 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm text-left shadow-xl">
            <form onSubmit={handleInternalLogin} className="space-y-4">
              <h2 className="text-white font-semibold text-lg text-center mb-2">
                Acesso ao Sistema
              </h2>
              
              {errorMsg && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm text-center">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Digite o usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 uppercase">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Digite a senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 text-base rounded-lg transition-all mt-2"
              >
                {loading ? "Verificando..." : "Entrar no Sistema"}
              </Button>
            </form>
          </Card>
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
              <p className="text-xs text-slate-500">Bem-vindo, {user?.name || "Operador"}</p>
            </div>
          </div>
          <button onClick={() => logout()} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card onClick={() => (window.location.href = "/new")} className="p-6 border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-300 cursor-pointer transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-emerald-100 group-hover:bg-emerald-200 rounded-lg transition-colors">
                <Plus className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Novo Abastecimento</h3>
            <p className="text-sm text-slate-600">Registre um novo abastecimento com foto do cupom</p>
          </Card>

          <Card onClick={() => (window.location.href = "/refuelings")} className="p-6 border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 cursor-pointer transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-blue-100 group-hover:bg-blue-200 rounded-lg transition-colors">
                <List className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Abastecimentos</h3>
            <p className="text-sm text-slate-600">Visualize todos os seus abastecimentos registrados</p>
          </Card>

          <Card onClick={() => (window.location.href = "/dashboard")} className="p-6 border-slate-200 shadow-sm hover:shadow-md hover:border-purple-300 cursor-pointer transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="p-3 bg-purple-100 group-hover:bg-purple-200 rounded-lg transition-colors">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Dashboard</h3>
            <p className="text-sm text-slate-600">Análise gastos, consumo e exporte seus dados</p>
          </Card>
        </div>
      </div>
    </div>
  );
}