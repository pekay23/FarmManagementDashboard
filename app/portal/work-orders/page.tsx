"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, WorkOrder } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Plus, Wrench, Search, MapPin, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export default function WorkOrdersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    crop_id: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    status: "Draft" as const,
  });

  const workOrders = useLiveQuery(() => db.work_orders.toArray()) || [];
  const crops = useLiveQuery(() => db.crops.toArray()) || [];
  const employees = useLiveQuery(() => db.employees.where("isActive").equals("true").toArray()) || [];

  const filteredOrders = workOrders.filter((o) => {
    const matchesSearch = o.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "All" || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newOrder: WorkOrder = {
        ...formData,
        id: uuidv4(),
        syncStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.work_orders.put(newOrder);
      toast.success("Work order created successfully");
      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        assigned_to: "",
        crop_id: "",
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        status: "Draft",
      });
    } catch {
      toast.error("Failed to create work order");
    }
  };

  const updateStatus = async (id: string, newStatus: WorkOrder['status']) => {
    try {
      await db.work_orders.update(id, { status: newStatus, syncStatus: "updated", updatedAt: new Date().toISOString() });
      toast.success(`Status updated to ${newStatus}`);
    } catch {
      toast.error("Failed to update status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "success";
      case "In Progress": return "info";
      case "Draft": return "secondary";
      case "Cancelled": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Manage equipment, maintenance, and field operations"
        icon={<Wrench className="h-6 w-6 text-primary" />}
        action={
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Order
          </Button>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-[180px]"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </div>
      </Card>

      {filteredOrders.length === 0 ? (
        <EmptyState
          title="No work orders found"
          description={searchTerm ? "Try adjusting your search criteria" : "Create a new work order to get started"}
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Create Work Order
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => {
            const crop = crops.find(c => c.id === order.crop_id);
            return (
              <Card key={order.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={getStatusColor(order.status) as any}>{order.status}</Badge>
                    <span className="text-xs text-muted-foreground font-medium">#{order.id.slice(0, 8)}</span>
                  </div>
                  <CardTitle className="text-lg">{order.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {order.description || "No description provided"}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(order.start_date).toLocaleDateString()}</span>
                    </div>
                    {crop && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{crop.plot_number}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-4 flex gap-2">
                    {order.status === "Draft" && (
                      <Button variant="outline" size="sm" className="w-full" onClick={() => updateStatus(order.id, "In Progress")}>
                        Start Order
                      </Button>
                    )}
                    {order.status === "In Progress" && (
                      <Button variant="primary" size="sm" className="w-full" onClick={() => updateStatus(order.id, "Completed")}>
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Complete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Work Order">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title *</label>
            <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g., Tractor Maintenance" />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Details of the work to be done..." />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign To</label>
              <Select value={formData.assigned_to} onChange={e => setFormData({...formData, assigned_to: e.target.value})}>
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Plot (Optional)</label>
              <Select value={formData.crop_id} onChange={e => setFormData({...formData, crop_id: e.target.value})}>
                <option value="">None</option>
                {crops.map(c => <option key={c.id} value={c.id}>{c.plot_number} - {c.crop_type}</option>)}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Start Date *</label>
              <Input type="date" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">End Date</label>
              <Input type="date" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Create Order</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
