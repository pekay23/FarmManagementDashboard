"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Plan } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { Plus, Search, Calendar, Target, Leaf, Map, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";

export default function PlanningPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Crop Rotation");

  const [formData, setFormData] = useState({
    title: "",
    type: "Crop Rotation",
    season: new Date().getFullYear().toString(),
    details: "",
  });

  const plans = useLiveQuery(() => db.plans.toArray()) || [];

  const filteredPlans = plans.filter((p) => {
    return p.title.toLowerCase().includes(searchTerm.toLowerCase()) && p.type === activeTab;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newPlan: Plan = {
        ...formData,
        id: uuidv4(),
        syncStatus: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.plans.put(newPlan);
      toast.success("Plan created successfully");
      setIsModalOpen(false);
      setFormData({
        title: "",
        type: activeTab,
        season: new Date().getFullYear().toString(),
        details: "",
      });
    } catch {
      toast.error("Failed to create plan");
    }
  };

  const getIconForType = (type: string) => {
      switch(type) {
          case 'Crop Rotation': return <Map className="w-5 h-5 text-emerald-500" />;
          case 'Financial': return <TrendingUp className="w-5 h-5 text-blue-500" />;
          case 'Resource': return <Target className="w-5 h-5 text-amber-500" />;
          default: return <Leaf className="w-5 h-5 text-primary" />;
      }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farm Planning"
        description="Strategic crop rotation, resource allocation, and forecasting"
        icon={<Calendar className="h-6 w-6 text-primary" />}
        action={
          <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" /> New Plan
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['Crop Rotation', 'Financial', 'Resource'].map(tab => (
              <Button 
                key={tab} 
                variant={activeTab === tab ? 'primary' : 'outline'}
                onClick={() => { setActiveTab(tab); setFormData({...formData, type: tab}); }}
                className="whitespace-nowrap"
              >
                  {getIconForType(tab)}
                  <span className="ml-2">{tab}</span>
              </Button>
          ))}
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={`Search ${activeTab.toLowerCase()} plans...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </Card>

      {filteredPlans.length === 0 ? (
        <EmptyState
          title={`No ${activeTab} plans found`}
          description="Create a strategic plan for the upcoming seasons"
          action={
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" /> Create {activeTab} Plan
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="flex flex-col hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="secondary">{plan.season}</Badge>
                  <span className="text-xs text-muted-foreground font-medium">{new Date(plan.createdAt).toLocaleDateString()}</span>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                    {getIconForType(plan.type)}
                    {plan.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {plan.details || "No detailed description provided. Click to add specifics."}
                </p>
                <div className="mt-auto pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center group-hover:text-primary transition-colors">
                      Click to view full plan
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Create ${activeTab} Plan`}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Plan Title *</label>
            <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder={`e.g., Q3 ${activeTab} Strategy`} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Plan Type</label>
              <Select disabled value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                <option value="Crop Rotation">Crop Rotation</option>
                <option value="Financial">Financial</option>
                <option value="Resource">Resource</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Target Season/Year *</label>
              <Select value={formData.season} onChange={e => setFormData({...formData, season: e.target.value})}>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
                <option value="Spring">Spring / Early</option>
                <option value="Autumn">Autumn / Late</option>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">High-Level Details</label>
            <textarea 
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.details} 
                onChange={e => setFormData({...formData, details: e.target.value})} 
                placeholder="Enter strategic goals, metrics, or steps..." 
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit">Save Plan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
