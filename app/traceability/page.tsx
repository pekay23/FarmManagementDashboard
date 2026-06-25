"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, TraceabilityBatch } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Plus, Search, QrCode, Tag, Package, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function TraceabilityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    batch_number: "",
    crop_id: "",
    harvest_date: new Date().toISOString().split("T")[0],
    quantity: "",
    quality_grade: "A",
    notes: "",
  });

  const batches = useLiveQuery(() => db.traceability_batches.toArray()) || [];
  const crops = useLiveQuery(() => db.crops.toArray()) || [];

  const filteredBatches = batches.filter((b) => {
    return b.batch_number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newBatch: TraceabilityBatch = {
        ...formData,
        quantity: Number(formData.quantity),
        id: uuidv4(),
        syncStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.traceability_batches.put(newBatch);
      toast.success("Batch created successfully");
      setIsModalOpen(false);
      setFormData({
        batch_number: "",
        crop_id: "",
        harvest_date: new Date().toISOString().split("T")[0],
        quantity: "",
        quality_grade: "A",
        notes: "",
      });
    } catch {
      toast.error("Failed to create batch");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traceability"
        description="Track harvest batches from field to market"
        icon={<QrCode className="h-6 w-6 text-primary" />}
        action={
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Batch
          </Button>
        }
      />

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by batch number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {filteredBatches.length === 0 ? (
        <EmptyState
          title="No batches found"
          description={searchTerm ? "Try adjusting your search criteria" : "Register a new batch to start tracking"}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Register Batch
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBatches.map((batch) => {
            const crop = crops.find(c => c.id === batch.crop_id);
            return (
              <Card key={batch.id} className="flex flex-col relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <QrCode className="w-24 h-24" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 bg-accent rounded-md">
                        <Tag className="w-3 h-3" /> Grade {batch.quality_grade}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">{new Date(batch.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <CardTitle className="text-lg font-mono tracking-tight">{batch.batch_number}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3 z-10">
                  <div className="grid grid-cols-2 gap-3 text-sm mt-2">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Quantity
                        </p>
                        <p className="font-semibold">{batch.quantity} kg</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Harvest
                        </p>
                        <p className="font-semibold">{new Date(batch.harvest_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {crop && (
                      <div className="mt-2 p-2 bg-accent/50 rounded-lg border text-sm">
                          <p className="font-medium">{crop.crop_type} - {crop.variety || 'Unknown variety'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Plot: {crop.plot_number}</p>
                      </div>
                  )}
                  
                  <div className="mt-auto pt-4">
                      <Button variant="outline" size="sm" className="w-full group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                        <QrCode className="w-4 h-4 mr-2" /> View Traceability
                      </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Register Traceability Batch">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Batch Number *</label>
            <div className="flex items-center gap-2">
                <Input required value={formData.batch_number} onChange={e => setFormData({...formData, batch_number: e.target.value})} placeholder="e.g., BATCH-2026-001" className="font-mono uppercase" />
                <Button type="button" variant="outline" onClick={() => setFormData({...formData, batch_number: `B-${Date.now().toString().slice(-6)}`})}>
                    Generate
                </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Source Crop</label>
            <Select required value={formData.crop_id} onChange={e => setFormData({...formData, crop_id: e.target.value})}>
              <option value="">Select Crop/Plot</option>
              {crops.map(c => <option key={c.id} value={c.id}>{c.plot_number} - {c.crop_type}</option>)}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Harvest Date *</label>
              <Input type="date" required value={formData.harvest_date} onChange={e => setFormData({...formData, harvest_date: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Quantity (kg) *</label>
              <Input type="number" required min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})} />
            </div>
          </div>

          <div className="space-y-1.5">
              <label className="text-sm font-medium">Quality Grade</label>
              <Select value={formData.quality_grade} onChange={e => setFormData({...formData, quality_grade: e.target.value})}>
                <option value="A">Grade A (Premium)</option>
                <option value="B">Grade B (Standard)</option>
                <option value="C">Grade C (Processing)</option>
              </Select>
            </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Input value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any additional details..." />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Register Batch</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
