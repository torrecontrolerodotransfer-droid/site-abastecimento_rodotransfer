import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { ArrowLeft, Upload, X, Check } from "lucide-react";

const FUEL_TYPES = [
  { value: "gasolina", label: "Gasolina" },
  { value: "diesel-s10", label: "Diesel S-10" },
  { value: "diesel-s500", label: "Diesel S-500" },
  { value: "etanol", label: "Etanol" },
  { value: "gnv", label: "GNV" },
];

export default function NewRefueling() {
  const handleNavigate = (path: string) => {
    window.location.href = path;
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    plate: "",
    driverName: "",
    fuelType: "gasolina",
    pricePerLiter: "",
    litersRefueled: "",
    gasStation: "",
    km: "",
    notes: "",
  });

  const [receiptFile, setReceiptFile] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createRefuelingMutation = trpc.refueling.create.useMutation();
  const uploadReceiptMutation = trpc.refueling.uploadReceipt.useMutation();

  const totalPrice =
    formData.pricePerLiter && formData.litersRefueled
      ? (parseFloat(formData.pricePerLiter) * parseFloat(formData.litersRefueled)).toFixed(2)
      : "0.00";

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setReceiptFile({
        file,
        preview: e.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.plate.trim()) {
      toast.error("Placa é obrigatória");
      return;
    }
    if (!formData.driverName.trim()) {
      toast.error("Nome do motorista é obrigatório");
      return;
    }
    if (!formData.pricePerLiter || parseFloat(formData.pricePerLiter) <= 0) {
      toast.error("Valor por litro deve ser maior que zero");
      return;
    }
    if (!formData.litersRefueled || parseFloat(formData.litersRefueled) <= 0) {
      toast.error("Litros abastecidos deve ser maior que zero");
      return;
    }
    if (!formData.gasStation.trim()) {
      toast.error("Posto é obrigatório");
      return;
    }
    if (!formData.km || parseInt(formData.km) <= 0) {
      toast.error("KM deve ser um número positivo");
      return;
    }
    if (!receiptFile) {
      toast.error("Foto do cupom é obrigatória");
      return;
    }

    setIsSubmitting(true);

    try {
      const refueling = await createRefuelingMutation.mutateAsync({
        date: new Date(formData.date),
        plate: formData.plate.toUpperCase(),
        driverName: formData.driverName,
        fuelType: formData.fuelType,
        pricePerLiter: parseFloat(formData.pricePerLiter),
        litersRefueled: parseFloat(formData.litersRefueled),
        totalPrice: parseFloat(totalPrice),
        gasStation: formData.gasStation,
        km: parseInt(formData.km),
        notes: formData.notes || undefined,
      });

      const fileData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = (e.target?.result as string).split(",")[1];
          resolve(base64);
        };
        reader.readAsDataURL(receiptFile.file);
      });

      await uploadReceiptMutation.mutateAsync({
        refuelingId: refueling.id,
        fileData,
        fileName: receiptFile.file.name,
        mimeType: receiptFile.file.type,
      });

      toast.success("Abastecimento registrado com sucesso!");
      handleNavigate("/refuelings");
    } catch (error: any) {
      toast.error(error?.message || "Erro ao registrar abastecimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => handleNavigate("/")}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Novo Abastecimento</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Data</Label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              className="w-full"
            />
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Placa</Label>
            <Input
              type="text"
              placeholder="ABC-1234"
              value={formData.plate}
              onChange={(e) => handleInputChange("plate", e.target.value.toUpperCase())}
              className="w-full"
            />
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Nome do Motorista</Label>
            <Input
              type="text"
              placeholder="Digite o nome do motorista"
              value={formData.driverName}
              onChange={(e) => handleInputChange("driverName", e.target.value)}
              className="w-full"
            />
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Tipo de Combustível</Label>
            <Select
              value={formData.fuelType}
              onValueChange={(value) => handleInputChange("fuelType", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUEL_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Card>

          <div className="grid grid-cols-2 gap-4">
            <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Valor por Litro</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.pricePerLiter}
                onChange={(e) => handleInputChange("pricePerLiter", e.target.value)}
                className="w-full"
              />
            </Card>
            <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <Label className="text-sm font-semibold text-slate-700 mb-2 block">Litros Abastecidos</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.litersRefueled}
                onChange={(e) => handleInputChange("litersRefueled", e.target.value)}
                className="w-full"
              />
            </Card>
          </div>

          <Card className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 shadow-sm">
            <Label className="text-sm font-semibold text-emerald-900 mb-2 block">Valor Total</Label>
            <div className="text-3xl font-bold text-emerald-700">R$ {totalPrice}</div>
            <p className="text-xs text-emerald-600 mt-1">Calculado automaticamente</p>
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Posto</Label>
            <Input
              type="text"
              placeholder="Nome do posto"
              value={formData.gasStation}
              onChange={(e) => handleInputChange("gasStation", e.target.value)}
              className="w-full"
            />
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">KM do Veículo</Label>
            <Input
              type="number"
              placeholder="0"
              value={formData.km}
              onChange={(e) => handleInputChange("km", e.target.value)}
              className="w-full"
            />
          </Card>

          <Card className="p-5 border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <Label className="text-sm font-semibold text-slate-700 mb-2 block">Notas (Opcional)</Label>
            <Textarea
              placeholder="Adicione observacoes sobre este abastecimento..."
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              className="w-full resize-none"
              rows={3}
            />
          </Card>

          <Card className="p-5 border-2 border-dashed border-slate-300 shadow-sm hover:border-slate-400 transition-colors">
            <Label className="text-sm font-semibold text-slate-700 mb-4 block">Foto do Cupom Fiscal</Label>

            {receiptFile ? (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden bg-slate-100 aspect-square max-w-xs">
                  <img
                    src={receiptFile.preview}
                    alt="Preview do cupom"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptFile(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <Check className="w-4 h-4" />
                  <span>{receiptFile.file.name}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Câmera
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Galeria
                  </button>
                </div>
                <p className="text-xs text-slate-500 text-center">Formatos suportados: JPG, PNG</p>
              </div>
            )}

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCameraCapture}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </Card>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleNavigate("/")}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? "Salvando..." : "Salvar Abastecimento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
