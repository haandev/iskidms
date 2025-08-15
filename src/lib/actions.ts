"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { userOperations, deviceOperations } from "./db";
import { auth } from "./auth";

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, "Kullanıcı adı gereklidir"),
  password: z.string().min(1, "Şifre gereklidir"),
});

const registerSchema = z
  .object({
    username: z.string().min(3, "Kullanıcı adı en az 3 karakter olmalıdır"),
    password: z.string().min(6, "Şifre en az 6 karakter olmalıdır"),
    confirmPassword: z.string(),
    company_name: z.string().min(1, "Firma adı gereklidir"),
    email: z.email("Invalid email address"),
    phone: z.string().min(1, "Telefon numarası gereklidir"),
    issuer_person: z.string().min(1, "Yetkili kişi gereklidir"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut şifre gereklidir"),
    newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalıdır"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Yeni şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

// Authentication actions
export async function loginAction(formData: FormData) {
  const rawData = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
  };

  const validatedData = loginSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { username, password } = validatedData.data;

  try {
    const user = await userOperations.findByUsername(username);

    if (!user) {
      return {
        error: "Invalid username or password",
      };
    }

    const isValid = await userOperations.verifyPassword(
      user.passwordHash,
      password
    );

    if (!isValid) {
      return {
        error: "Invalid username or password",
      };
    }

    // Create session
    await auth.createSession(user.id);

    // Redirect based on role
    if (user.role === "admin") {
      redirect("/admin");
    } else {
      redirect("/agent");
    }
  } catch (error) {
    console.error("Login error:", error);
    return {
      error: "An error occurred during login",
    };
  }
}

export async function registerAction(formData: FormData) {
  const rawData = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    company_name: formData.get("company_name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    issuer_person: formData.get("issuer_person") as string,
  };

  const validatedData = registerSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { username, password, company_name, email, phone, issuer_person } =
    validatedData.data;

  try {
    // Check if username already exists
    const existingUser = await userOperations.findByUsername(username);

    if (existingUser) {
      return {
        error: "Kullanıcı adı zaten mevcut",
      };
    }

    // Create new agent user
    await userOperations.create(
      username,
      password,
      "agent",
      company_name,
      email,
      phone,
      issuer_person
    );

    return {
      success: "Hesap başarıyla oluşturuldu. Lütfen giriş yapınız.",
    };
  } catch (error) {
    console.error("Registration error:", error);
    return {
      error: "Kayıt sırasında bir hata oluştu",
    };
  }
}

export async function logoutAction() {
  await auth.destroySession();
  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session) {
    return {
      error: "Yetkisiz - lütfen tekrar giriş yapınız",
    };
  }

  const rawData = {
    currentPassword: formData.get("currentPassword") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedData = changePasswordSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { currentPassword, newPassword } = validatedData.data;

  try {
    // Get user to verify current password
    const user = await userOperations.findByUsername(session.user.username);

    if (!user) {
      return {
        error: "Kullanıcı bulunamadı",
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await userOperations.verifyPassword(
      user.passwordHash,
      currentPassword
    );

    if (!isCurrentPasswordValid) {
      return {
        error: "Mevcut şifre yanlış",
      };
    }

    // Update password
    await userOperations.updatePassword(session.userId, newPassword);

    return {
      success: "Şifre başarıyla değiştirildi",
    };
  } catch (error) {
    console.error("Change password error:", error);
    return {
      error: "Şifre değiştirilirken bir hata oluştu",
    };
  }
}

// Device management actions
export async function createDeviceAction() {
  const session = await auth.getSession();

  if (!session || session.user.role !== "agent") {
    return {
      error: "Yetkisiz",
    };
  }

  try {
    const device = await deviceOperations.create(
      session.userId,
      session.user.username
    );

    revalidatePath("/agent");

    return {
      success: "Cihaz hesabı başarıyla oluşturuldu",
      device,
    };
  } catch (error) {
    console.error("Create device error:", error);
    return {
      error: "Cihaz hesabı oluşturulurken bir hata oluştu",
    };
  }
}

export async function approveDeviceAction(deviceId: string) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz",
    };
  }

  try {
    deviceOperations.approve(deviceId);

    revalidatePath("/admin");

    return {
      success: "Cihaz hesabı onaylandı",
    };
  } catch (error) {
    console.error("Approve device error:", error);
    return {
      error: "Cihaz hesabı onaylanırken bir hata oluştu",
    };
  }
}

export async function deleteDeviceAction(deviceId: string) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz",
    };
  }

  try {
    deviceOperations.delete(deviceId);

    revalidatePath("/admin");

    return {
      success: "Cihaz hesabı başarıyla silindi",
    };
  } catch (error) {
    console.error("Delete device error:", error);
    return {
      error: "Cihaz hesabı silinirken bir hata oluştu",
    };
  }
}

// Helper function to get current user devices
export async function getCurrentUserDevices() {
  const session = await auth.getSession();

  if (!session || session.user.role !== "agent") {
    return [];
  }

  return deviceOperations.findByAgentId(session.userId);
}

// Helper function to get pending devices (admin only)
export async function getPendingDevices() {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return [];
  }

  return await deviceOperations.findPending();
}

// Helper function to get Tümü (admin only)
export async function getAllDevices() {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return [];
  }

  return deviceOperations.findAll();
}

// Agent management actions (admin only)
export async function createAgentAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  const rawData = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
    company_name: formData.get("company_name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    issuer_person: formData.get("issuer_person") as string,
  };

  const validatedData = registerSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { username, password, company_name, email, phone, issuer_person } =
    validatedData.data;

  try {
    // Check if username already exists
    const existingUser = await userOperations.findByUsername(username);

    if (existingUser) {
      return {
        error: "Kullanıcı adı zaten mevcut",
      };
    }

    // Create new agent user
    await userOperations.create(
      username,
      password,
      "agent",
      company_name,
      email,
      phone,
      issuer_person
    );

    revalidatePath("/admin");

    return {
      success: "Firma oluşturuldu",
    };
  } catch (error) {
    console.error("Create agent error:", error);
    return {
      error: "Firma oluşturulurken bir hata oluştu",
    };
  }
}

export async function deleteAgentAction(agentId: string) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  try {
    // Don't allow deleting self
    if (agentId === session.userId) {
      return {
        error: "Kendi hesabınızı silemezsiniz",
      };
    }

    userOperations.deleteById(agentId);

    revalidatePath("/admin");

    return {
      success: "Firma silindi",
    };
  } catch (error) {
    console.error("Delete agent error:", error);
    return {
      error: "Firma silinirken bir hata oluştu",
    };
  }
}

const changeAgentPasswordSchema = z
  .object({
    agentId: z.string().min(1, "Agent ID is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export async function changeAgentPasswordAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  const rawData = {
    agentId: formData.get("agentId") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const validatedData = changeAgentPasswordSchema.safeParse(rawData);

  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { agentId, newPassword } = validatedData.data;

  try {
    // Get agent to verify they exist and are an agent
    const agent = await userOperations.findById(agentId);

    if (!agent) {
      return {
        error: "Firma bulunamadı",
      };
    }

    // Update password
    await userOperations.updatePassword(agentId, newPassword);

    // Invalidate all sessions for this agent to force re-login
    userOperations.invalidateUserSessions(agentId);

    revalidatePath("/admin");

    return {
      success:
        "Firma şifresi başarıyla değiştirildi. Firma tekrar giriş yapmalıdır.",
    };
  } catch (error) {
    console.error("Change agent password error:", error);
    return {
      error: "Şifre değiştirilirken bir hata oluştu",
    };
  }
}

export async function transferDeviceOwnershipAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  const deviceId = formData.get("deviceId") as string;
  const newAgentId = formData.get("newAgentId") as string;

  if (!deviceId || !newAgentId) {
    return {
      error: "Cihaz ID ve yeni firma gereklidir",
    };
  }

  try {
    // Verify device exists
    const device = deviceOperations.findById(deviceId);
    if (!device) {
      return {
        error: "Cihaz bulunamadı",
      };
    }

    // Verify new agent exists and is an agent
    const newAgent = await userOperations.findById(newAgentId);
    if (!newAgent) {
      return {
        error: "Yeni firma bulunamadı",
      };
    }

    if (newAgent.role !== "agent") {
      return {
        error: "Hedef kullanıcı bir firma olmalıdır",
      };
    }

    // Update device ownership
    deviceOperations.transferOwnership(deviceId, newAgentId);

    revalidatePath("/admin");

    return {
      success: `Cihaz sahipliği ${newAgent.username} firmaine başarıyla aktarıldı`,
    };
  } catch (error) {
    console.error("Transfer device ownership error:", error);
    return {
      error: "Cihaz sahipliği aktarılırken bir hata oluştu",
    };
  }
}

export async function removeDeviceOwnershipAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  const deviceId = formData.get("deviceId") as string;

  if (!deviceId) {
    return {
      error: "Cihaz ID gereklidir",
    };
  }

  try {
    // Verify device exists
    const device = deviceOperations.findById(deviceId);
    if (!device) {
      return {
        error: "Cihaz bulunamadı",
      };
    }

    // Remove device ownership
    deviceOperations.removeOwnership(deviceId);

    revalidatePath("/admin");

    return {
      success: "Cihaz sahipliği başarıyla kaldırıldı",
    };
  } catch (error) {
    console.error("Remove device ownership error:", error);
    return {
      error: "Cihaz sahipliği kaldırılırken bir hata oluştu",
    };
  }
}

// CSV import validation schema
const csvDeviceSchema = z.object({
  username: z
    .string()
    .min(1, "Cihaz hesabı kullanıcı adı gereklidir")
    .max(50, "Cihaz hesabı kullanıcı adı çok uzun"),
  password: z
    .string()
    .min(1, "Cihaz hesabı şifresi gereklidir")
    .max(100, "Cihaz hesabı şifresi çok uzun"),
});

export async function importDevicesFromCSVAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  const csvData = formData.get("csvData") as string;

  if (!csvData || csvData.trim() === "") {
    return {
      error: "CSV verisi gereklidir",
    };
  }

  try {
    const lines = csvData.trim().split("\n");
    const devices: { username: string; password: string }[] = [];
    const errors: string[] = [];

    // Parse CSV lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "") continue; // Skip empty lines

      const [username, password] = line.split(",").map((s) => s.trim());

      if (!username || !password) {
        errors.push(
          `Satır ${i + 1}: Geçersiz format. Beklenen "username,password"`
        );
        continue;
      }

      // Validate each device
      const validation = csvDeviceSchema.safeParse({ username, password });
      if (!validation.success) {
        errors.push(
          `Satır ${i + 1}: ${validation.error.issues
            .map((e: any) => e.message)
            .join(", ")}`
        );
        continue;
      }

      devices.push({ username, password });
    }

    if (errors.length > 0) {
      return {
        error: `Validation errors:\n${errors.join("\n")}`,
      };
    }

    if (devices.length === 0) {
      return {
        error: "CSV verisinde geçerli cihaz bulunamadı",
      };
    }

    // Create devices in database
    const createdDevices: string[] = [];
    const creationErrors: string[] = [];

    for (const device of devices) {
      try {
        const deviceId = deviceOperations.create(
          null,
          device.username,
          device.password,
          "active"
        );
        createdDevices.push(device.username);
      } catch (error) {
        creationErrors.push(
          `Cihaz oluşturulurken hata oluştu: "${device.username}": ${
            error instanceof Error ? error.message : "Bilinmeyen hata"
          }`
        );
      }
    }

    revalidatePath("/admin");

    if (creationErrors.length > 0) {
      return {
        error: `Bazı cihazlar için hata oluştu:\n${creationErrors.join(
          "\n"
        )}\n\nBaşarıyla içe aktarılan cihazlar: ${createdDevices.length} cihaz`,
      };
    }

    return {
      success: `Başarıyla ${createdDevices.length} cihaz içe aktarıldı`,
    };
  } catch (error) {
    console.error("CSV içe aktarma hatası:", error);
    return {
      error: "CSV verisi işlenirken bir hata oluştu",
    };
  }
}

export async function createDeviceForAgentAction(formData: FormData) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return {
      error: "Yetkisiz - yönetici erişimi gerekiyor",
    };
  }

  const agentId = formData.get("agentId") as string;
  const agentName = formData.get("agentName") as string;

  if (!agentId || !agentName) {
    return {
      error: "Firma ID ve adı gereklidir",
    };
  }

  try {
    // Verify agent exists
    const agent = await userOperations.findById(agentId);
    if (!agent) {
      return {
        error: "Firma bulunamadı",
      };
    }

    if (agent.role !== "agent") {
      return {
        error: "Kullanıcı bir firma olmalıdır",
      };
    }

    // Create device for the agent
    const device = await deviceOperations.create(agentId, agentName);

    revalidatePath("/admin");

    return {
      success: `Cihaz başarıyla oluşturuldu: ${device.username}`,
      device: device,
    };
  } catch (error) {
    console.error("Create device for agent error:", error);
    return {
      error: "Cihaz oluşturulurken bir hata oluştu",
    };
  }
}

// Helper function to get all agents (admin only)
export async function getAllAgents() {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return [];
  }

  return userOperations.findAllAgents();
}

// Helper function to get agent details by ID (admin only)
export async function getAgentById(agentId: string) {
  const session = await auth.getSession();

  if (!session || session.user.role !== "admin") {
    return null;
  }

  try {
    const agent = await userOperations.findById(agentId);
    
    if (!agent || agent.role !== "agent") {
      return null;
    }

    return {
      id: agent.id,
      username: agent.username,
      company_name: agent.company_name,
      email: agent.email,
      phone: agent.phone,
      issuer_person: agent.issuer_person,
      role: agent.role,
      createdAt: agent.createdAt
    };
  } catch (error) {
    console.error("Get agent by ID error:", error);
    return null;
  }
}
