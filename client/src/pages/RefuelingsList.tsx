import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Eye, Trash2, Calendar, Droplet, MapPin, Gauge, Filter, X, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function RefuelingsList() {
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    plate: "",
    fuelType: "",
    startDate: "",
    endDate: "",
  });
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 10;

  const { data: allRefuelings, isLoading } = trpc.refueling.list.useQuery({
    limit: 10000,
    offset: 0,
  });

  const deleteRefuelingMutation = trpc.refueling.delete.useMutation();
  const { data: receipt } = trpc.refueling.getReceipt.useQuery(
    { refuelingId: selectedReceipt?.id || 0 },
    { enabled: !!selectedReceipt }
  );

  // Filter refuelings
  const filteredRefuelings = (allRefuelings || []).filter((r: any) => {
    if (filters.plate && !r.plate.toLowerCase().includes(filters.plate.toLowerCase())) return false;
    if (filters.fuelType && r.fuelType !== filters.fuelType) return false;
    if (filters.startDate && new Date(r.date) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(r.date) > new Date(filters.endDate)) return false;
    return true;
  });

  // Paginate
  const totalPages = Math.ceil(filteredRefuelings.length / itemsPerPage);
  const refuelings = filteredRefuelings.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleDelete = async (id: number) => {
    if (!confirm("Tem certeza que deseja deletar este abastecimento?")) return;

    try {
      await deleteRefuelingMutation.mutateAsync({ id });
      toast.success("Abastecimento deletado com sucesso!");
      setCurrentPage(0);
    } catch (error: any) {
      toast.error(error?.message || "Erro ao deletar abastecimento");
    }
  };

  const handleResetFilters = () => {
    setFilters({ plate: "", fuelType: "", startDate: "", endDate: "" });
    setCurrentPage(0);
  };

  const handleViewReceipt = (refueling: any) => {
    setSelectedReceipt(refueling);
    setIsDialogOpen(true);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const formatCurrency = (value: string | number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(value));
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
            <h1 className="text-xl font-semibold text-slate-900">Abastecimentos</h1>
          </div>
          <Button
            onClick={() => (window.location.href = "/new")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Filtros */}
        <div className="mb-6">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className="flex items-center gap-2 mb-4"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? "Ocultar" : "Mostrar"} Filtros
          </Button>

          {showFilters && (
            <Card className="p-4 border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Placa
                  </label>
                  <Input
                    placeholder="Ex: ABC-1234"
                    value={filters.plate}
                    onChange={(e) => {
                      setFilters({ ...filters, plate: e.target.value });
                      setCurrentPage(0);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Combustível
                  </label>
                  <Select
                    value={filters.fuelType}
                    onValueChange={(value) => {
                      setFilters({ ...filters, fuelType: value });
                      setCurrentPage(0);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="gasolina">Gasolina</SelectItem>
                      <SelectItem value="diesel-s10">Diesel S-10</SelectItem>
                      <SelectItem value="diesel-s500">Diesel S-500</SelectItem>
                      <SelectItem value="etanol">Etanol</SelectItem>
                      <SelectItem value="gnv">GNV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Data Inicial
                  </label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => {
                      setFilters({ ...filters, startDate: e.target.value });
                      setCurrentPage(0);
                    }}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">
                    Data Final
                  </label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => {
                      setFilters({ ...filters, endDate: e.target.value });
                      setCurrentPage(0);
                    }}
                  />
                </div>
              </div>
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </Button>
            </Card>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : !filteredRefuelings || filteredRefuelings.length === 0 ? (
          <Card className="p-12 text-center border-slate-200 shadow-sm">
            <Droplet className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-4">
              {allRefuelings?.length === 0
                ? "Nenhum abastecimento registrado"
                : "Nenhum abastecimento encontrado com os filtros aplicados"}
            </p>
            <Button
              onClick={() => (window.location.href = "/new")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Registrar Primeiro Abastecimento
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-slate-600 mb-4">
              Mostrando {currentPage * itemsPerPage + 1} a{" "}
              {Math.min((currentPage + 1) * itemsPerPage, filteredRefuelings.length)} de{" "}
              {filteredRefuelings.length} abastecimentos
            </div>

            {refuelings.map((refueling: any) => (
              <Card
                key={refueling.id}
                className="p-4 border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{refueling.plate}</h3>
                    <p className="text-sm text-slate-500">{refueling.fuelType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-emerald-600">
                      {formatCurrency(refueling.totalPrice)}
                    </p>
                    <p className="text-xs text-slate-500">Total</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{formatDate(refueling.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Droplet className="w-4 h-4 text-slate-400" />
                    <span>{Number(refueling.litersRefueled).toFixed(2)} L</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{refueling.gasStation}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Gauge className="w-4 h-4 text-slate-400" />
                    <span>{refueling.km} km</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleViewReceipt(refueling)}
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Ver Cupom
                  </Button>
                  <Button
                    onClick={() => handleDelete(refueling.id)}
                    variant="outline"
                    size="sm"
                    className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </Button>
                </div>
              </Card>
            ))}

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                <Button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                >
                  Anterior
                </Button>
                <span className="text-sm text-slate-600">
                  Página {currentPage + 1} de {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                  variant="outline"
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cupom Fiscal - {selectedReceipt?.plate}</DialogTitle>
          </DialogHeader>
          {receipt && (
            <div className="space-y-4">
              <img
                src={receipt.storageUrl}
                alt="Cupom fiscal"
                className="w-full rounded-lg border border-slate-200"
              />
              <div className="text-sm text-slate-600">
                <p>
                  <strong>Arquivo:</strong> {receipt.fileName}
                </p>
                <p>
                  <strong>Tamanho:</strong> {(receipt.fileSize / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
