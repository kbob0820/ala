import { useState } from 'react';
import type { Client } from '@/types';

export interface ClientFormData {
  name: string;
  address: string;
  work: string;
  work_address: string;
  contact_number: string;
  social_media: string;
  notes: string;
  photo: File | null;
}

interface ClientFormProps {
  initialData?: Client;
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  loading: boolean;
  generalError: string | null;
  fieldErrors: Record<string, string[]>;
}

export function ClientForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel,
  loading,
  generalError,
  fieldErrors,
}: ClientFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [address, setAddress] = useState(initialData?.address ?? '');
  const [work, setWork] = useState(initialData?.work ?? '');
  const [workAddress, setWorkAddress] = useState(initialData?.work_address ?? '');
  const [contactNumber, setContactNumber] = useState(initialData?.contact_number ?? '');
  const [socialMedia, setSocialMedia] = useState(
    initialData?.social_media ? JSON.stringify(initialData.social_media) : '',
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    initialData?.photo_url ?? null,
  );

  function handlePhotoChange(file: File | null) {
    setPhoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPhotoPreview(initialData?.photo_url ?? null);
    }
  }

  function fieldError(field: string): string | null {
    return fieldErrors[field]?.[0] ?? null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) return;

    const formData = new FormData();
    formData.append('name', trimmedName);
    if (address.trim()) formData.append('address', address.trim());
    if (work.trim()) formData.append('work', work.trim());
    if (workAddress.trim()) formData.append('work_address', workAddress.trim());
    if (contactNumber.trim()) formData.append('contact_number', contactNumber.trim());
    if (socialMedia.trim()) {
      try {
        const parsed = JSON.parse(socialMedia.trim());
        Object.entries(parsed).forEach(([key, val]) => {
          formData.append(`social_media[${key}]`, val ?? '');
        });
      } catch {
        // silently skip invalid JSON
      }
    }
    if (notes.trim()) formData.append('notes', notes.trim());
    if (photo) formData.append('photo', photo);

    await onSubmit(formData);
  }

  return (
    <div className="card">
      <div className="card-body">
        {generalError && <div className="alert alert-danger">{generalError}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row">
            <div className="col-md-4 mb-4">
              <div className="ala-upload-panel h-100">
                <div className="form-label mb-0">Photo</div>
                <div>
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="img-thumbnail rounded-circle"
                      style={{ width: 150, height: 150, objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      className="bg-secondary bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center mx-auto"
                      style={{ width: 150, height: 150 }}
                    >
                      <i className="fa-solid fa-user fa-3x text-secondary" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  className="form-control form-control-sm"
                  accept="image/*" capture="environment"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0] ?? null)}
                />
                {photoPreview && photo && (
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => handlePhotoChange(null)}
                  >
                    Remove
                  </button>
                )}
                {fieldError('photo') && (
                  <div className="text-danger small mt-1">{fieldError('photo')}</div>
                )}
              </div>
            </div>

            <div className="col-md-8">
              <div className="ala-form-section">
                <i className="fa-solid fa-user" />
                Personal Information
              </div>

              <div className="mb-3">
                <label htmlFor="name" className="form-label">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className={`form-control ${fieldError('name') ? 'is-invalid' : ''}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juan Dela Cruz"
                  required
                />
                {fieldError('name') && (
                  <div className="invalid-feedback">{fieldError('name')}</div>
                )}
              </div>

              <div className="mb-3">
                <label htmlFor="contact_number" className="form-label">
                  <i className="fa-solid fa-phone me-1" />
                  Contact Number
                </label>
                <input
                  id="contact_number"
                  type="text"
                  className={`form-control ${fieldError('contact_number') ? 'is-invalid' : ''}`}
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 09171234567"
                />
                {fieldError('contact_number') && (
                  <div className="invalid-feedback">{fieldError('contact_number')}</div>
                )}
              </div>
            </div>
          </div>

          <div className="ala-form-section mt-4">
            <i className="fa-solid fa-map-location-dot" />
            Address Information
          </div>

          <div className="mb-3">
            <label htmlFor="address" className="form-label">
              Residential Address
            </label>
            <textarea
              id="address"
              className={`form-control ${fieldError('address') ? 'is-invalid' : ''}`}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Rizal St., Barangay San Isidro, Makati City"
              rows={2}
            />
            {fieldError('address') && (
              <div className="invalid-feedback">{fieldError('address')}</div>
            )}
          </div>

          <div className="ala-form-section mt-4">
            <i className="fa-solid fa-briefcase" />
            Employment Information
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="work" className="form-label">
                Occupation / Employer
              </label>
              <input
                id="work"
                type="text"
                className={`form-control ${fieldError('work') ? 'is-invalid' : ''}`}
                value={work}
                onChange={(e) => setWork(e.target.value)}
                placeholder="e.g. Teacher"
              />
              {fieldError('work') && (
                <div className="invalid-feedback">{fieldError('work')}</div>
              )}
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="work_address" className="form-label">
                Work Address
              </label>
              <textarea
                id="work_address"
                className={`form-control ${fieldError('work_address') ? 'is-invalid' : ''}`}
                value={workAddress}
                onChange={(e) => setWorkAddress(e.target.value)}
                placeholder="e.g. DepEd Main Office, Pasig City"
                rows={2}
              />
              {fieldError('work_address') && (
                <div className="invalid-feedback">{fieldError('work_address')}</div>
              )}
            </div>
          </div>

          <div className="ala-form-section mt-4">
            <i className="fa-solid fa-share-nodes" />
            Social Media &amp; Notes
          </div>

          <div className="mb-3">
            <label htmlFor="social_media" className="form-label">
              Social Media Links
            </label>
            <input
              id="social_media"
              type="text"
              className={`form-control ${fieldError('social_media') ? 'is-invalid' : ''}`}
              value={socialMedia}
              onChange={(e) => setSocialMedia(e.target.value)}
              placeholder='{"facebook":"juan.delacruz", "messenger":"juan.delacruz"}'
            />
            <div className="form-text">Enter as JSON with facebook and messenger keys</div>
            {fieldError('social_media') && (
              <div className="invalid-feedback">{fieldError('social_media')}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="notes" className="form-label">
              Notes
            </label>
            <textarea
              id="notes"
              className={`form-control ${fieldError('notes') ? 'is-invalid' : ''}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional remarks about the borrower..."
              rows={3}
            />
            {fieldError('notes') && (
              <div className="invalid-feedback">{fieldError('notes')}</div>
            )}
          </div>

          <div className="d-flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" />
                  Saving...
                </>
              ) : (
                submitLabel
              )}
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
