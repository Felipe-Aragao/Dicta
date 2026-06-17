import { useEffect, useState } from "react";
import { Camera, CheckCircle, Trash, User } from "@phosphor-icons/react";

const MAX_PROFILE_IMAGE_SIZE = 1024 * 1024;

export function ProfileScreen({ user, fallbackName, onSave, onDeleteAccount, onBack }) {
  const [name, setName] = useState(user?.name || fallbackName || "");
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profile_image_url || "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setName(user?.name || fallbackName || "");
    setProfileImageUrl(user?.profile_image_url || "");
  }, [fallbackName, user?.name, user?.profile_image_url]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError("");
    setSuccess("");
    if (!file.type.startsWith("image/")) {
      setError("Selecione uma imagem válida.");
      return;
    }
    if (file.size > MAX_PROFILE_IMAGE_SIZE) {
      setError("A imagem deve ter no máximo 1 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setProfileImageUrl(String(reader.result || ""));
    reader.onerror = () => setError("Não foi possível carregar a imagem.");
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Informe um nome para o perfil.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await onSave({ name: trimmedName, profileImageUrl: profileImageUrl || null });
      setSuccess("Perfil atualizado.");
    } catch (err) {
      setError(err?.message ?? "Falha ao atualizar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    try {
      await onDeleteAccount();
    } catch (err) {
      setError(err?.message ?? "Falha ao excluir conta.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="page">
      <div className="page-narrow">
        <div className="section-header profile-header">
          <div className="section-header-left">
            <h2 className="section-title">Editar perfil</h2>
            <p className="section-sub">Atualize suas informações da conta</p>
          </div>
          <div className="section-header-right">
            <button className="btn btn-outline btn-sm" type="button" onClick={onBack}>
              Voltar
            </button>
          </div>
        </div>

        <form className="card profile-card" onSubmit={handleSubmit}>
          {success && (
            <div className="profile-success-toast" role="status">
              <CheckCircle size={17} weight="bold" />
              {success}
            </div>
          )}

          <div className="profile-photo-row">
            <div className="profile-photo-preview" aria-label="Foto de perfil">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="" />
              ) : (
                <User size={38} weight="regular" />
              )}
            </div>

            <div className="profile-photo-actions">
              <label className="btn btn-secondary btn-sm profile-file-btn">
                <Camera size={16} weight="bold" />
                Alterar foto
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </label>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => {
                  setProfileImageUrl("");
                  setSuccess("");
                }}
                disabled={!profileImageUrl || saving}
              >
                Remover foto
              </button>
            </div>
          </div>

          <div className="field-group">
            <div className="field-wrap">
              <label className="field-label" htmlFor="profile-name">Nome</label>
              <input
                id="profile-name"
                className="text-input"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSuccess("");
                }}
                maxLength={255}
                disabled={saving}
              />
            </div>
          </div>

          {error && <p className="field-error" role="alert">{error}</p>}

          <div className="profile-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>
          </div>

          <div className="profile-danger-zone">
            <div>
              <h3>Excluir conta</h3>
              <p>Remove sua conta e os dados associados a ela.</p>
            </div>
            <button
              className="btn btn-danger btn-sm"
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={saving}
            >
              <Trash size={16} weight="bold" />
              Excluir conta
            </button>
          </div>
        </form>
      </div>

      {confirmDelete && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <h2 className="modal-title" style={{ marginBottom: 10 }}>Excluir conta</h2>
            <p style={{ color: "var(--text-2)", fontSize: "0.94rem", lineHeight: 1.55 }}>
              Esta ação não pode ser desfeita.
            </p>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Excluindo..." : "Excluir conta"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
