import { formatDocument, maskPhone } from "./masks.js";

export function buildProfileEditForm(u) {
  return {
    name: u?.name || "",
    email: u?.email || "",
    phone: u?.phone ? maskPhone(u.phone) : "",
    id_type: u?.id_type || "CPF",
    id_number: u?.id_number ? formatDocument(u?.id_type || "CPF", u.id_number) : "",
    newPassword: "",
    confirmNewPassword: "",
    currentPassword: "",
  };
}
