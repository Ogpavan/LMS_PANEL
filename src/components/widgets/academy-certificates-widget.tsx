"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Check, CheckCircle2, FileCheck, Plus, RefreshCcw, Upload, X } from "lucide-react";
import { toast } from "sonner";

import type { WidgetRendererProps } from "@/types/admin";

import {
  type RichTableAction,
  type RichTableColumn,
  type RichTableRow,
  RichDataTable
} from "@/components/data-table/rich-data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";

interface CertificateTemplate {
  id: number;
  templateName: string;
  courseTitle: string;
  imageUrl?: string;
  issuedCount: number;
  status: string;
  createdAt: string;
}

interface CertificateQueueRecord {
  id: number;
  certificateCode: string;
  templateId: number;
  templateName: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  issuedDate: string;
  status: string;
}

interface CertificatesData {
  templates: CertificateTemplate[];
  certificateQueue: CertificateQueueRecord[];
}

interface ApiResponse<T> {
  success?: boolean;
  error?: string;
  data?: T;
  url?: string;
}

const templateColumns: RichTableColumn[] = [
  { key: "templateName", header: "Template", type: "highlight" },
  { key: "courseTitle", header: "Course" },
  {
    key: "assetStatus",
    header: "Design Asset",
    render: (row) => {
      const hasAsset = Boolean(row.imageUrl && String(row.imageUrl).trim());
      if (hasAsset) {
        return (
          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Uploaded
          </span>
        );
      }
      return <span className="text-[12px] text-muted-foreground">No asset</span>;
    }
  },
  { key: "issuedCount", header: "Number of issued certificates", align: "center" },
  { key: "status", header: "Status", type: "badge" }
];

const queueColumns: RichTableColumn[] = [
  { key: "certificateCode", header: "Certificate Code" },
  { key: "studentName", header: "Student Name", type: "highlight" },
  { key: "studentEmail", header: "Email" },
  { key: "courseTitle", header: "Course" },
  { key: "issuedDate", header: "Date Issued" },
  { key: "status", header: "Status", type: "badge" }
];

export function AcademyCertificatesWidget({ config }: WidgetRendererProps) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const clearSession = useAuthStore((state) => state.clearSession);
  const user = useAuthStore((state) => state.user);

  const [data, setData] = useState<CertificatesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [issueForm, setIssueForm] = useState({
    templateId: "",
    studentName: "",
    studentEmail: "",
    courseTitle: ""
  });

  const [templateForm, setTemplateForm] = useState({
    name: "",
    courseTitle: "",
    imageUrl: "",
    status: "active"
  });

  const userRole = user?.role ? String(user.role).toLowerCase() : "";
  const canCreate = !userRole || userRole === "admin" || userRole === "administrator" || userRole === "instructor";

  useEffect(() => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    void loadCertificates();
  }, [accessToken]);

  async function loadCertificates() {
    setIsLoading(true);

    try {
      const response = await fetch("/api/v1/certificates", {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      const result = (await response.json()) as ApiResponse<CertificatesData>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success || !result.data) {
        toast.error("Unable to load certificates", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      setData(result.data);
    } catch {
      toast.error("Unable to load certificates", {
        description: "Please check your network connection and try again."
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", "certificate-template");

    try {
      const response = await fetch("/api/v1/uploads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      });

      const result = (await response.json()) as ApiResponse<{ url?: string }>;

      if (!response.ok || !result.success) {
        toast.error("Upload failed", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      const fileUrl = result.url || result.data?.url || "";
      setTemplateForm((curr) => ({ ...curr, imageUrl: fileUrl }));
      toast.success("Template file uploaded successfully!");
    } catch {
      toast.error("Upload failed", { description: "Could not upload template asset." });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleCreateTemplate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!templateForm.name || !templateForm.courseTitle) {
      toast.error("Template name and course title are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: "create-template",
          name: templateForm.name,
          courseTitle: templateForm.courseTitle,
          imageUrl: templateForm.imageUrl,
          status: templateForm.status
        })
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error("Template creation failed", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Certificate template created successfully!");
      setShowTemplateModal(false);
      setTemplateForm({ name: "", courseTitle: "", imageUrl: "", status: "active" });
      await loadCertificates();
    } catch {
      toast.error("Template creation failed", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleIssueCertificate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!issueForm.templateId || !issueForm.studentName || !issueForm.studentEmail || !issueForm.courseTitle) {
      toast.error("Please fill out all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/v1/certificates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: "issue-certificate",
          templateId: Number(issueForm.templateId),
          studentName: issueForm.studentName,
          studentEmail: issueForm.studentEmail,
          courseTitle: issueForm.courseTitle
        })
      });

      const result = (await response.json()) as ApiResponse<unknown>;

      if (response.status === 401) {
        clearSession();
        router.replace("/login");
        return;
      }

      if (!response.ok || !result.success) {
        toast.error("Certificate issuance failed", {
          description: result.error ?? "Please try again."
        });
        return;
      }

      toast.success("Certificate issued successfully!");
      setShowIssueModal(false);
      setIssueForm({ templateId: "", studentName: "", studentEmail: "", courseTitle: "" });
      await loadCertificates();
    } catch {
      toast.error("Certificate issuance failed", {
        description: "Please try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const templateRowActions = useMemo<RichTableAction[]>(
    () => [
      {
        label: "View Asset",
        icon: "view",
        disabled: (row) => !row.imageUrl || !String(row.imageUrl).trim(),
        onClick: (row) => {
          if (row.imageUrl && String(row.imageUrl).trim()) {
            setPreviewImageUrl(String(row.imageUrl));
          }
        }
      },
      {
        label: "Issue",
        icon: "edit",
        onClick: (row) => {
          setIssueForm((curr) => ({
            ...curr,
            templateId: String(row.id),
            courseTitle: String(row.courseTitle)
          }));
          setShowIssueModal(true);
          setShowTemplateModal(false);
        }
      }
    ],
    []
  );

  const summary = useMemo(() => {
    if (!data) return [];

    const totalTemplates = data.templates.length;
    const totalIssued = data.certificateQueue.length;
    const activeTemplates = data.templates.filter((t) => t.status.toLowerCase() === "active").length;

    return [
      {
        label: "Certificate Templates",
        value: String(totalTemplates),
        icon: Award,
        iconClassName: "bg-[#ece9ff] text-[#7367f0]",
        valueClassName: "text-[#7367f0]"
      },
      {
        label: "Total Issued Certificates",
        value: String(totalIssued),
        icon: FileCheck,
        iconClassName: "bg-[#dff7ff] text-[#00bad1]",
        valueClassName: "text-[#00bad1]"
      },
      {
        label: "Active Templates",
        value: String(activeTemplates),
        icon: CheckCircle2,
        iconClassName: "bg-[#e4f7ec] text-[#28c76f]",
        valueClassName: "text-[#28c76f]"
      }
    ];
  }, [data]);

  const templateRows: RichTableRow[] = useMemo(() => {
    if (!data) return [];
    return data.templates.map((item) => ({
      id: String(item.id),
      templateName: item.templateName,
      courseTitle: item.courseTitle,
      imageUrl: item.imageUrl || "",
      issuedCount: `${item.issuedCount}`,
      status: item.status
    }));
  }, [data]);

  const queueRows: RichTableRow[] = useMemo(() => {
    if (!data) return [];
    return data.certificateQueue.map((item) => ({
      id: String(item.id),
      certificateCode: item.certificateCode,
      studentName: item.studentName,
      studentEmail: item.studentEmail,
      courseTitle: item.courseTitle,
      issuedDate: formatDate(item.issuedDate),
      status: item.status
    }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Asset Preview Modal Overlay */}
      {previewImageUrl ? (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full rounded-xl bg-card p-6 shadow-2xl space-y-4 border border-border cursor-default"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-semibold text-foreground">Certificate Design Asset Preview</h3>
              <Button variant="ghost" size="sm" onClick={() => setPreviewImageUrl(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center rounded-lg border border-border/70 bg-muted/20 p-4 max-h-[70vh] overflow-auto">
              <img
                src={previewImageUrl}
                alt="Certificate Design Asset Preview"
                className="max-h-[60vh] max-w-full object-contain rounded shadow-sm"
              />
            </div>
          </div>
        </div>
      ) : null}

      {/* Summary Cards */}
      <Card>
        <CardContent className="p-0">
          <div className="grid gap-px overflow-hidden rounded-md bg-border/70 md:grid-cols-3">
            {summary.map(({ label, value, icon: Icon, iconClassName, valueClassName }) => (
              <div key={label} className="flex items-center gap-4 bg-white px-5 py-4 dark:bg-card">
                <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-md ${iconClassName}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-medium text-muted-foreground">{label}</div>
                  <div className={`mt-0.5 text-[28px] font-semibold leading-none ${valueClassName}`}>
                    {isLoading ? "..." : value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>{config?.title ?? "Certificate Queue & Templates"}</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => void loadCertificates()} disabled={isLoading}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {canCreate ? (
                <>
                  <Button variant="outline" onClick={() => { setShowTemplateModal((p) => !p); setShowIssueModal(false); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                  <Button onClick={() => { setShowIssueModal((p) => !p); setShowTemplateModal(false); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Issue Certificate
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Template Form */}
          {showTemplateModal ? (
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Add New Certificate Template</h3>
              <form onSubmit={handleCreateTemplate} className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Template Name *</span>
                  <Input
                    type="text"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((curr) => ({ ...curr, name: e.target.value }))}
                    placeholder="e.g. Master Completion Template"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Course Name *</span>
                  <Input
                    type="text"
                    value={templateForm.courseTitle}
                    onChange={(e) => setTemplateForm((curr) => ({ ...curr, courseTitle: e.target.value }))}
                    placeholder="e.g. Frontend Mastery"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Status</span>
                  <select
                    value={templateForm.status}
                    onChange={(e) => setTemplateForm((curr) => ({ ...curr, status: e.target.value }))}
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending review</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Upload Template Image / Background</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*,.pdf,.svg"
                      onChange={(e) => void handleFileUpload(e)}
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <span className="text-xs text-muted-foreground">Uploading...</span>
                    ) : null}
                  </div>
                  {templateForm.imageUrl ? (
                    <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Upload className="h-3 w-3" /> Asset attached: {templateForm.imageUrl}
                    </div>
                  ) : null}
                </label>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowTemplateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? "Creating..." : "Save Template"}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Issue Certificate Form */}
          {showIssueModal ? (
            <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Issue New Certificate</h3>
              <form onSubmit={handleIssueCertificate} className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Select Template *</span>
                  <select
                    value={issueForm.templateId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      const selectedT = data?.templates.find((t) => String(t.id) === tId);
                      setIssueForm((current) => ({
                        ...current,
                        templateId: tId,
                        courseTitle: selectedT?.courseTitle || current.courseTitle
                      }));
                    }}
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    required
                  >
                    <option value="">Select a template</option>
                    {data?.templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.templateName} ({t.courseTitle})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Course Title *</span>
                  <Input
                    type="text"
                    value={issueForm.courseTitle}
                    onChange={(e) => setIssueForm((curr) => ({ ...curr, courseTitle: e.target.value }))}
                    placeholder="Course name"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Student Name *</span>
                  <Input
                    type="text"
                    value={issueForm.studentName}
                    onChange={(e) => setIssueForm((curr) => ({ ...curr, studentName: e.target.value }))}
                    placeholder="Full name"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-foreground">Student Email *</span>
                  <Input
                    type="email"
                    value={issueForm.studentEmail}
                    onChange={(e) => setIssueForm((curr) => ({ ...curr, studentEmail: e.target.value }))}
                    placeholder="student@demo.com"
                    required
                  />
                </label>

                <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowIssueModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Issuing..." : "Issue Certificate"}
                  </Button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Templates Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Certificate Templates</h3>
            {isLoading ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Loading certificate templates...
              </div>
            ) : !data || templateRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No certificate templates found in the database.
              </div>
            ) : (
              <RichDataTable columns={templateColumns} rows={templateRows} rowActions={templateRowActions} />
            )}
          </div>

          {/* Issued Queue Section */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Issued Certificate Log</h3>
            {isLoading ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                Loading issued certificate queue...
              </div>
            ) : !data || queueRows.length === 0 ? (
              <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                No issued certificates logged yet.
              </div>
            ) : (
              <RichDataTable columns={queueColumns} rows={queueRows} />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
