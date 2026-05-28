import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, Lock, Fuel, LogOut, Plus, List, BarChart3 } from "lucide-react";
import { trpc } from "@/lib/trpc"; 

export default function Home() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Checa a sessão inicial
  const { data: session, isLoading: sessionLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  // Mutação oficial agora protegida pelo transformer superjson
  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      refetch().then(() => {
        window.location.reload();
      });
    },
    onError: (err) => {
      setLoading(false);
      setErrorMsg(err.message || "Usuário ou senha incorretos.");
    },
  });

  const handleInternalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    loginMutation.mutate({ 
      username: username.trim(), 
      password: password.trim() 
    });
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <p className="text-slate-500 font-medium animate-pulse">Carregando sistema...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="flex justify-center mb-2">
            <img 
              src="https://i.ibb.co/RG2bmMsv/Logo-branca.png" 
              alt="Logo Empresa" 
              className="max-w-[280px] h-auto object-contain"
              style={{ filter: "brightness(0.15)" }} 
            />
          </div>
          <h1 className="text-2xl font-bold text-[#2F4F4F]">Sistema de Abastecimento</h1>
          <p className="text-emerald-800 font-medium text-sm tracking-wider uppercase">Centro de Operações Logísticas</p>

          <Card className="p-6 bg-[#f3f1eb] border-slate-300/60 shadow-md text-left">
            <form onSubmit={handleInternalLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-700 text-sm text-center font-medium">
                  {errorMsg}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Usuário</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: RODOTRANSFER"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-[#E9967A]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg py-2 pl-10 pr-4 text-slate-800 focus:outline-none focus:border-[#E9967A]"
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-[#E9967A] hover:bg-[#df8567] text-white font-bold py-2.5 mt-4">
                {loading ? "Verificando..." : "Entrar"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Menu Administrativo Padrão */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Fuel className="w-5 h-5 text-emerald-600" />
            <div>
              <h1 className="text-base font-bold text-slate-900">Sistema de Abastecimento</h1>
              <p className="text-xs text-slate-500">Operador: {session.name || "Rodotransfer"}</p>
            </div>
          </div>
          <button onClick={() => fetch("/api/trpc/auth.logout", { method: "POST" }).then(() => window.location.reload())}>
            <LogOut className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card onClick={() => (window.location.href = "/new")} className="p-6 bg-white shadow-sm hover:border-[#E9967A] cursor-pointer">
            <Plus className="w-6 h-6 text-emerald-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Novo Abastecimento</h3>
          </Card>
          <Card onClick={() => (window.location.href = "/refuelings")} className="p-6 bg-white shadow-sm hover:border-[#E9967A] cursor-pointer">
            <List className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Abastecimentos</h3>
          </Card>
          <Card onClick={() => (window.location.href = "/dashboard")} className="p-6 bg-white shadow-sm hover:border-[#E9967A] cursor-pointer">
            <BarChart3 className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-semibold text-slate-900">Dashboard</h3>
          </Card>
        </div>
      </div>
    </div>
  );
}