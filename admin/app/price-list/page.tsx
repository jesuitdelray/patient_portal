"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/lib/api";
import { Loader } from "@/app/components/Loader";

export default function PriceListPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    duration: "",
    order: "0",
    isActive: true,
  });

  // Fetch price list (including inactive items for admin)
  const { data, isLoading } = useQuery({
    queryKey: ["admin-price-list"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/price-list?includeInactive=true`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch price list");
      return res.json();
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = editingItem
        ? `${API_BASE}/price-list/${editingItem.id}`
        : `${API_BASE}/price-list`;
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: data.title,
          description: data.description || null,
          price: parseFloat(data.price),
          category: data.category || null,
          duration: data.duration ? parseInt(data.duration) : null,
          order: parseInt(data.order) || 0,
          isActive: data.isActive,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-price-list"] });
      setShowForm(false);
      setEditingItem(null);
      setFormData({
        title: "",
        description: "",
        price: "",
        category: "",
        duration: "",
        order: "0",
        isActive: true,
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API_BASE}/price-list/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-price-list"] });
    },
  });

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description || "",
      price: item.price.toString(),
      category: item.category || "",
      duration: item.duration?.toString() || "",
      order: item.order?.toString() || "0",
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const priceList = data?.priceList || [];
  const categories = data?.categories || [];
  const grouped = data?.grouped || {};

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Price List</h1>
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({
              title: "",
              description: "",
              price: "",
              category: "",
              duration: "",
              order: "0",
              isActive: true,
            });
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Procedure
        </button>
      </div>

      {isLoading ? (
        <Loader />
      ) : (
        <>
          {categories.length > 0 ? (
            <div className="space-y-6">
              {categories.map((category: string) => {
                const items = grouped[category] || [];
                return (
                  <div key={category} className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-900">
                      {category}
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                              Title
                            </th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">
                              Description
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                              Price
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                              Duration
                            </th>
                            <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">
                              Status
                            </th>
                            <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item: any) => (
                            <tr
                              key={item.id}
                              className="border-b border-slate-100 hover:bg-slate-50"
                            >
                              <td className="py-3 px-4 text-slate-900 font-medium">
                                {item.title}
                              </td>
                              <td className="py-3 px-4 text-slate-600 text-sm">
                                {item.description || "-"}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-900 font-semibold">
                                ${item.price.toFixed(2)}
                              </td>
                              <td className="py-3 px-4 text-right text-slate-600">
                                {item.duration ? `${item.duration} min` : "-"}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.isActive
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {item.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => handleEdit(item)}
                                    className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Are you sure you want to delete "${item.title}"?`
                                        )
                                      ) {
                                        deleteMutation.mutate(item.id);
                                      }
                                    }}
                                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-600">No procedures in price list yet.</p>
              <p className="text-sm text-slate-500 mt-2">
                Click "Add Procedure" to get started.
              </p>
            </div>
          )}
        </>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-slate-900">
                {editingItem ? "Edit Procedure" : "Add Procedure"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Price ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Duration (minutes)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.duration}
                      onChange={(e) =>
                        setFormData({ ...formData, duration: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      placeholder="e.g., Cleaning, Restoration"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Order
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({ ...formData, order: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label
                    htmlFor="isActive"
                    className="ml-2 text-sm text-slate-700"
                  >
                    Active
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {saveMutation.isPending
                      ? "Saving..."
                      : editingItem
                      ? "Update"
                      : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

