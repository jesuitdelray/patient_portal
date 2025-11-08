/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { Loader } from "@/app/components/Loader";

type BrandingData = {
  clinicName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  faviconUrl: string | null;
  updatedAt: string | null;
};

const DEFAULT_BRANDING: BrandingData = {
  clinicName: null,
  logoUrl: null,
  primaryColor: "#3B82F6",
  secondaryColor: "#64748B",
  accentColor: "#10B981",
  faviconUrl: null,
  updatedAt: null,
};

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const showAlert = (message: string) => {
    if (typeof window !== "undefined") {
      window.alert(message);
    } else {
      console.log("[Branding] notice:", message);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/branding", { credentials: "include" });
        if (!res.ok) {
          throw new Error("Failed to load branding");
        }
        const data = await res.json();
        setBranding({
          clinicName: data.clinicName,
          logoUrl: data.logoUrl,
          primaryColor: data.primaryColor || DEFAULT_BRANDING.primaryColor,
          secondaryColor: data.secondaryColor || DEFAULT_BRANDING.secondaryColor,
          accentColor: data.accentColor || DEFAULT_BRANDING.accentColor,
          faviconUrl: data.faviconUrl,
          updatedAt: data.updatedAt || null,
        });
        if (data.logoUrl) {
          setLogoPreview(
            data.logoUrl.startsWith("http")
              ? data.logoUrl
              : `${API_BASE.replace(/\/api$/, "")}${data.logoUrl}`
          );
        }
        if (data.faviconUrl) {
          setFaviconPreview(
            data.faviconUrl.startsWith("http")
              ? data.faviconUrl
              : `${API_BASE.replace(/\/api$/, "")}${data.faviconUrl}`
          );
        }
      } catch (error) {
        console.error("[Branding] load failed:", error);
        showAlert("Failed to load branding settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/branding", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error || "Failed to save branding");
      }
      showAlert("Branding updated");
      router.refresh();
    } catch (error: any) {
      console.error("[Branding] save failed:", error);
      showAlert(error.message || "Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File, type: "logo" | "favicon") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/branding/upload", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error || "Upload failed");
    }

    const data = await res.json();
    if (type === "logo") {
      setBranding((prev) => ({ ...prev, logoUrl: data.url }));
      setLogoPreview(
        data.url.startsWith("http")
          ? data.url
          : `${API_BASE.replace(/\/api$/, "")}${data.url}`
      );
    } else {
      setBranding((prev) => ({ ...prev, faviconUrl: data.url }));
      setFaviconPreview(
        data.url.startsWith("http")
          ? data.url
          : `${API_BASE.replace(/\/api$/, "")}${data.url}`
      );
    }
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await handleFileUpload(file, "logo");
      showAlert("Logo uploaded");
    } catch (error: any) {
      console.error("[Branding] logo upload failed:", error);
      showAlert(error.message || "Logo upload failed");
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleFaviconChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await handleFileUpload(file, "favicon");
      showAlert("Favicon uploaded");
    } catch (error: any) {
      console.error("[Branding] favicon upload failed:", error);
      showAlert(error.message || "Favicon upload failed");
    } finally {
      if (faviconInputRef.current) {
        faviconInputRef.current.value = "";
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clinic Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Update the logo, clinic name, and brand colors for the patient portal.
        </p>
      </div>

      <div className="space-y-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Clinic Name
          </label>
          <input
            type="text"
            value={branding.clinicName ?? ""}
            onChange={(event) =>
              setBranding((prev) => ({
                ...prev,
                clinicName: event.target.value || null,
              }))
            }
            placeholder="Enter clinic name"
            maxLength={50}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Logo
          </label>
          <p className="text-xs text-slate-500 mb-3">
            PNG / JPG / SVG / WEBP · max 2&nbsp;MB · square image recommended (≥256
            × 256px). Transparent background works best.
          </p>
          <div className="flex items-center gap-4">
            {logoPreview && (
              <div className="w-32 h-32 border rounded-lg p-2 bg-slate-50 flex items-center justify-center">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                onChange={handleLogoChange}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                {logoPreview ? "Change Logo" : "Upload Logo"}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Primary Color
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={branding.primaryColor || "#3B82F6"}
              onChange={(event) =>
                setBranding((prev) => ({
                  ...prev,
                  primaryColor: event.target.value,
                }))
              }
              className="w-20 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={branding.primaryColor ?? ""}
              onChange={(event) =>
                setBranding((prev) => ({
                  ...prev,
                  primaryColor: event.target.value || null,
                }))
              }
              placeholder="#3B82F6"
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Secondary Color (Optional)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={branding.secondaryColor || "#64748B"}
              onChange={(event) =>
                setBranding((prev) => ({
                  ...prev,
                  secondaryColor: event.target.value || null,
                }))
              }
              className="w-20 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={branding.secondaryColor ?? ""}
              onChange={(event) =>
                setBranding((prev) => ({
                  ...prev,
                  secondaryColor: event.target.value || null,
                }))
              }
              placeholder="#64748B"
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Accent Color (Optional)
          </label>
          <div className="flex items-center gap-4">
            <input
              type="color"
              value={branding.accentColor || "#10B981"}
              onChange={(event) =>
                setBranding((prev) => ({
                  ...prev,
                  accentColor: event.target.value || null,
                }))
              }
              className="w-20 h-10 border rounded cursor-pointer"
            />
            <input
              type="text"
              value={branding.accentColor ?? ""}
              onChange={(event) =>
                setBranding((prev) => ({
                  ...prev,
                  accentColor: event.target.value || null,
                }))
              }
              placeholder="#10B981"
              className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Favicon
          </label>
          <p className="text-xs text-slate-500 mb-3">
            PNG / SVG · max 1&nbsp;MB. Square image recommended (32 × 32px or
            higher).
          </p>
          <div className="flex items-center gap-4">
            {faviconPreview && (
              <div className="w-16 h-16 border rounded-lg p-2 bg-slate-50 flex items-center justify-center">
                <img
                  src={faviconPreview}
                  alt="Favicon preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
            <div className="flex-1">
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/svg+xml"
                onChange={handleFaviconChange}
                className="hidden"
              />
              <button
                onClick={() => faviconInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                {faviconPreview ? "Change Favicon" : "Upload Favicon"}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-200 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

