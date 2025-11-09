"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api";
import { Loader } from "@/app/components/Loader";

type BrandingColors = {
  brand: string;
  nav: string;
  cta: string;
  highlight: string;
  promo: string;
  danger: string;
};

type BrandingData = {
  clinicName: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  colors: BrandingColors;
  theme?: Record<string, string>;
  updatedAt: string | null;
};

const DEFAULT_COLORS: BrandingColors = {
  brand: "#2563EB",
  nav: "#FFFFFF",
  cta: "#2563EB",
  highlight: "#2563EB",
  promo: "#2563EB",
  danger: "#EF4444",
};

const DEFAULT_BRANDING: BrandingData = {
  clinicName: null,
  logoUrl: null,
  faviconUrl: null,
  colors: { ...DEFAULT_COLORS },
  theme: undefined,
  updatedAt: null,
};

const COLOR_FIELDS: Array<{
  key: keyof BrandingColors;
  label: string;
  description: string;
  optional?: boolean;
}> = [
  {
    key: "brand",
    label: "Brand Color",
    description: "Logo, clinic name, subtle highlights.",
  },
  {
    key: "nav",
    label: "Navigation / Sidebar Color",
    description: "Sidebar background, icons, hover states. Defaults to light.",
    optional: true,
  },
  {
    key: "cta",
    label: "Primary Action Color",
    description: "Main CTAs: “Book”, “Save”.",
    optional: true,
  },
  {
    key: "highlight",
    label: "Highlight / Banner Color",
    description: "Banners, empty states, upcoming appointment cards.",
    optional: true,
  },
  {
    key: "promo",
    label: "Promo Color",
    description: "Promotions, discount badges such as “20% OFF”.",
    optional: true,
  },
  {
    key: "danger",
    label: "Danger Color",
    description: "Errors and critical alerts.",
    optional: true,
  },
];

function normalizeHex(value: string) {
  if (!value) return "";
  let hex = value.trim();
  if (!hex.startsWith("#")) {
    hex = `#${hex}`;
  }
  return hex.slice(0, 7).toUpperCase();
}

function ensureColorOrNull(value: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return normalizeHex(trimmed);
}

export default function BrandingPage() {
  const [branding, setBranding] = useState<BrandingData>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const faviconInputRef = useRef<HTMLInputElement | null>(null);
  const resetDisabled =
    JSON.stringify(branding.colors) === JSON.stringify(DEFAULT_COLORS);
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
        const mergedColors: BrandingColors = {
          brand: normalizeHex(data.colors?.brand ?? DEFAULT_COLORS.brand),
          nav: normalizeHex(data.colors?.nav ?? DEFAULT_COLORS.nav),
          cta: normalizeHex(data.colors?.cta ?? data.colors?.brand ?? DEFAULT_COLORS.cta),
          highlight: normalizeHex(
            data.colors?.highlight ?? data.colors?.brand ?? DEFAULT_COLORS.highlight
          ),
          promo: normalizeHex(
            data.colors?.promo ?? data.colors?.brand ?? DEFAULT_COLORS.promo
          ),
          danger: normalizeHex(data.colors?.danger ?? DEFAULT_COLORS.danger),
        };
        setBranding({
          clinicName: data.clinicName ?? null,
          logoUrl: data.logoUrl ?? null,
          faviconUrl: data.faviconUrl ?? null,
          colors: mergedColors,
          theme: data.theme,
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
      const payload = {
        clinicName: branding.clinicName,
        logoUrl: branding.logoUrl,
        faviconUrl: branding.faviconUrl,
        colors: {
          brand: branding.colors.brand,
          nav: ensureColorOrNull(branding.colors.nav),
          cta: ensureColorOrNull(branding.colors.cta),
          highlight: ensureColorOrNull(branding.colors.highlight),
          promo: ensureColorOrNull(branding.colors.promo),
          danger: ensureColorOrNull(branding.colors.danger),
        },
      };

      const res = await fetch("/api/branding", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const handleResetColors = () => {
    setBranding((prev) => ({
      ...prev,
      colors: { ...DEFAULT_COLORS },
      theme: undefined,
    }));
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

  const themePreview = useMemo(() => {
    return {
      navBg: branding.colors.nav || DEFAULT_COLORS.nav,
      navText: "#111827",
      brand: branding.colors.brand || DEFAULT_COLORS.brand,
      ctaBg: branding.colors.cta || branding.colors.brand || DEFAULT_COLORS.cta,
      highlightBg:
        branding.colors.highlight || branding.colors.brand || DEFAULT_COLORS.highlight,
      promoBg:
        branding.colors.promo || branding.colors.brand || DEFAULT_COLORS.promo,
      danger: branding.colors.danger || DEFAULT_COLORS.danger,
    };
  }, [branding.colors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Clinic Branding</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure the clinic palette. We will build the full theme and apply it
          across the patient portal automatically.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
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

          <div className="space-y-4">
            <section>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Logo
              </label>
              <p className="text-xs text-slate-500 mb-3">
                PNG / JPG / SVG / WEBP · max 2&nbsp;MB · square image recommended
                (≥256 × 256px).
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
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950 text-sm"
                  >
                    {logoPreview ? "Change Logo" : "Upload Logo"}
                  </button>
                </div>
              </div>
            </section>

            <section>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Favicon
              </label>
              <p className="text-xs text-slate-500 mb-3">
                PNG / SVG · max 1&nbsp;MB. Recommended size 32 × 32px or larger.
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
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950 text-sm"
                  >
                    {faviconPreview ? "Change Favicon" : "Upload Favicon"}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            {COLOR_FIELDS.map((field) => {
              const value = branding.colors[field.key] ?? "";
              return (
                <div key={field.key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {field.label}{" "}
                        {field.optional && (
                          <span className="text-xs text-slate-400">(optional)</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {field.description}
                      </p>
                    </div>
                    <input
                      type="color"
                      value={value || "#FFFFFF"}
                      onChange={(event) => {
                        const hex = normalizeHex(event.target.value);
                        setBranding((prev) => ({
                          ...prev,
                          colors: { ...prev.colors, [field.key]: hex },
                        }));
                      }}
                      className="w-16 h-10 border rounded cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    value={value}
                    onChange={(event) => {
                      const hex = event.target.value;
                      setBranding((prev) => ({
                        ...prev,
                        colors: {
                          ...prev.colors,
                          [field.key]: hex.toUpperCase(),
                        },
                      }));
                    }}
                    onBlur={(event) => {
                      const normalized = normalizeHex(event.target.value);
                      setBranding((prev) => ({
                        ...prev,
                        colors: { ...prev.colors, [field.key]: normalized },
                      }));
                    }}
                    placeholder={DEFAULT_COLORS[field.key]}
                    className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
              );
            })}
          </div>

                <div className="flex items-center justify-between border-t border-slate-200 pt-4 gap-3">
                  <button
                    onClick={handleResetColors}
                    disabled={resetDisabled}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="button"
                  >
                    Restore Medical Default
                  </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-950 text-sm disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-3">
              Live Preview
            </h2>
            <div
              className="rounded-lg border p-4 mb-4"
              style={{ backgroundColor: themePreview.navBg }}
            >
              <p className="text-xs font-medium uppercase tracking-wide mb-2">
                Sidebar
              </p>
              <div className="space-y-2">
                {["Dashboard", "Treatment", "Price List"].map((item, index) => (
                  <div
                    key={item}
                    className={`px-3 py-2 rounded-md text-sm ${
                      index === 0 ? "font-semibold" : ""
                    }`}
                    style={{
                      backgroundColor:
                        index === 0 ? themePreview.brand + "1A" : "transparent",
                      color:
                        index === 0 ? themePreview.brand : "#111827",
                    }}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div
                className="rounded-lg px-4 py-3 text-sm font-medium"
                style={{ backgroundColor: themePreview.highlightBg }}
              >
                Upcoming Appointment Banner
              </div>
              <button
                className="w-full rounded-md px-4 py-2 text-sm font-medium shadow-sm"
                style={{ backgroundColor: themePreview.ctaBg, color: "#111827" }}
              >
                Primary CTA
              </button>
              <div
                className="rounded-lg px-4 py-3 text-sm border"
                style={{ backgroundColor: themePreview.promoBg }}
              >
                Promo Card
              </div>
              <div
                className="rounded-lg px-4 py-2 text-xs font-medium text-white"
                style={{ backgroundColor: themePreview.danger }}
              >
                Danger example
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
