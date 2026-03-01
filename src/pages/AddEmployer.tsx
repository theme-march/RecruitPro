import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Upload, Plus, Trash2 } from "lucide-react";
import api from "../services/api";

const AddEmployer: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);
  const [vacancies, setVacancies] = useState<
    Array<{ job_title: string; required_count: number }>
  >([{ job_title: "", required_count: 1 }]);

  const [formData, setFormData] = useState({
    company_name: "",
    company_address: "",
    contact_person: "",
    contact_email: "",
    contact_phone: "",
    country: "",
    industry: "",
    website: "",
    description: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value.trim()) payload.append(key, value);
      });
      const validVacancies = vacancies.filter((v) => v.job_title.trim());
      payload.append("vacancies", JSON.stringify(validVacancies));
      if (logo) payload.append("logo", logo);

      await api.post("/employers", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      navigate("/employers");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to create employer");
    } finally {
      setLoading(false);
    }
  };

  const updateVacancy = (
    index: number,
    key: "job_title" | "required_count",
    value: string | number,
  ) => {
    setVacancies((prev) =>
      prev.map((v, i) =>
        i === index
          ? {
              ...v,
              [key]:
                key === "required_count" ? Math.max(1, Number(value) || 1) : value,
            }
          : v,
      ),
    );
  };

  const addVacancyRow = () => {
    setVacancies((prev) => [...prev, { job_title: "", required_count: 1 }]);
  };

  const removeVacancyRow = (index: number) => {
    setVacancies((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">Add New Employer</h1>
          <p className="text-slate-500 text-sm">
            Fill in the details to create an employer profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Company Name
              </label>
              <input
                type="text"
                name="company_name"
                required
                value={formData.company_name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Company Address
              </label>
              <input
                type="text"
                name="company_address"
                value={formData.company_address}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Contact Person
              </label>
              <input
                type="text"
                name="contact_person"
                value={formData.contact_person}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Contact Email
              </label>
              <input
                type="email"
                name="contact_email"
                value={formData.contact_email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Contact Phone
              </label>
              <input
                type="text"
                name="contact_phone"
                value={formData.contact_phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Country
              </label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Industry
              </label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Company Logo
            </label>
            <label className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 cursor-pointer hover:border-indigo-400 transition-colors">
              <div className="text-center">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">
                  {logo ? logo.name : "Click to upload logo"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  PNG, JPG, GIF (max 10MB)
                </p>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setLogo(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          <div className="space-y-4 border-t border-slate-100 pt-6">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Vacancies (Job + Required People)
              </label>
              <button
                type="button"
                onClick={addVacancyRow}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Job
              </button>
            </div>
            <div className="space-y-3">
              {vacancies.map((vacancy, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  <div className="md:col-span-8">
                    <input
                      type="text"
                      placeholder="Job title (e.g. Civil Engineer)"
                      value={vacancy.job_title}
                      onChange={(e) =>
                        updateVacancy(index, "job_title", e.target.value)
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <input
                      type="number"
                      min={1}
                      placeholder="Required"
                      value={vacancy.required_count}
                      onChange={(e) =>
                        updateVacancy(index, "required_count", e.target.value)
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      type="button"
                      onClick={() => removeVacancyRow(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Remove vacancy"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-5 h-5" />
              <span>{loading ? "Creating..." : "Create Employer"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddEmployer;
