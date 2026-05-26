import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Download, TrendingUp, Droplet, DollarSign, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Dashboard() {
  const { data: stats, isLoading } = trpc.refueling.stats.useQuery();
  const { data: refuelings } = trpc.refueling.list.useQuery({
    limit: 10000,
    offset: 0,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        "Data",
        "Placa",
        "Tipo Combustivel",
        "Valor por Litro",
        "Litros Abastecidos",
        "Valor Total",
        "Posto",
        "KM",
        "Notas",
      ];

      const rows = (refuelings || []).map((r: any) => [
        new Date(r.date).toLocaleDateString("pt-BR"),
        r.plate,
        r.fuelType,
        r.pricePerLiter,
        r.litersRefueled,
        r.totalPrice,
        r.gasStation,
        r.km,
        r.notes || "",
      ]);

      const csv =
        [headers, ...rows]
          .map((row) => row.map((cell) => `"${cell}"`).join(","))
          .join("\n") + "\n";

      const element = document.createElement("a");
      element.setAttribute("href", "data:text/csv;charset=utf-8," + encodeURIComponent(csv));
      element.setAttribute(
        "download",
        `abastecimentos-${new Date().toISOString().split("T")[0]}.csv`
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Arquivo CSV baixado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar CSV");
    }
  };

  const handleExportJSON = () => {
    try {
      const json = JSON.stringify(refuelings, null, 2);
      const element = document.createElement("a");
      element.setAttribute("href", "data:text/json;charset=utf-8," + encodeURIComponent(json));
      element.setAttribute(
        "download",
        `abastecimentos-${new Date().toISOString().split("T")[0]}.json`
      );
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Arquivo JSON baixado com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao exportar JSON");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => (window.location.href = "/")}
              variant="ghost"
              size="sm"
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-600 mb-1">Total Gasto</p>
                    <p className="text-3xl font-bold text-emerald-900">
                      {formatCurrency(stats?.totalSpent || 0)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-emerald-400" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Consumo Medio</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {(stats?.averageConsumption || 0).toFixed(2)} km/l
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-400" />
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600 mb-1">Total Abastecimentos</p>
                    <p className="text-3xl font-bold text-purple-900">{stats?.refuelingCount || 0}</p>
                  </div>
                  <Droplet className="w-8 h-8 text-purple-400" />
                </div>
              </Card>
            </div>

            {stats && Object.keys(stats.byPlate).length > 0 && (
              <Card className="p-6 border-slate-200 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Resumo por Veiculo</h2>
                <div className="space-y-3">
                  {Object.entries(stats.byPlate).map(([plate, data]: any) => (
                    <div
                      key={plate}
                      className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-slate-900">{plate}</h3>
                        <span className="text-sm font-medium text-emerald-600">
                          {formatCurrency(data.totalSpent)}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Abastecimentos</p>
                          <p className="font-semibold text-slate-900">{data.count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Total de Litros</p>
                          <p className="font-semibold text-slate-900">
                            {Number(data.totalLiters).toFixed(2)} L
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Consumo Medio</p>
                          <p className="font-semibold text-slate-900">
                            {data.averageConsumption.toFixed(2)} km/l
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-6 border-slate-200 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Exportar Dados</h2>
              <div className="flex gap-3">
                <Button
                  onClick={handleExportCSV}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </Button>
                <Button
                  onClick={handleExportJSON}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Exportar JSON
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
