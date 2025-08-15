'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { userOperations, deviceOperations } from './db';
import { auth } from './auth';

// Validation schemas
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

// Authentication actions
export async function loginAction(formData: FormData) {
  const rawData = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
  };

  const validatedData = loginSchema.safeParse(rawData);
  
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { username, password } = validatedData.data;

  try {
    const user = userOperations.findByUsername(username);
    
    if (!user) {
      return {
        error: 'Invalid username or password',
      };
    }

    const isValid = await userOperations.verifyPassword(user.passwordHash, password);
    
    if (!isValid) {
      return {
        error: 'Invalid username or password',
      };
    }

    // Create session
    await auth.createSession(user.id);

    // Redirect based on role
    if (user.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/agent');
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      error: 'An error occurred during login',
    };
  }
}

export async function registerAction(formData: FormData) {
  const rawData = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const validatedData = registerSchema.safeParse(rawData);
  
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { username, password } = validatedData.data;

  try {
    // Check if username already exists
    const existingUser = userOperations.findByUsername(username);
    
    if (existingUser) {
      return {
        error: 'Username already exists',
      };
    }

    // Create new agent user
    await userOperations.create(username, password, 'agent');

    return {
      success: 'Account created successfully. Please log in.',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      error: 'An error occurred during registration',
    };
  }
}

export async function logoutAction() {
  await auth.destroySession();
  redirect('/login');
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session) {
    return {
      error: 'Unauthorized - please log in again',
    };
  }

  const rawData = {
    currentPassword: formData.get('currentPassword') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
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
    const user = userOperations.findByUsername(session.user.username);
    
    if (!user) {
      return {
        error: 'User not found',
      };
    }

    // Verify current password
    const isCurrentPasswordValid = await userOperations.verifyPassword(user.passwordHash, currentPassword);
    
    if (!isCurrentPasswordValid) {
      return {
        error: 'Current password is incorrect',
      };
    }

    // Update password
    await userOperations.updatePassword(session.userId, newPassword);

    return {
      success: 'Password changed successfully',
    };
  } catch (error) {
    console.error('Change password error:', error);
    return {
      error: 'An error occurred while changing password',
    };
  }
}

// Device management actions
export async function createDeviceAction() {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'agent') {
    return {
      error: 'Unauthorized',
    };
  }

  try {
    const device = deviceOperations.create(session.userId, session.user.username);
    
    revalidatePath('/agent');
    
    return {
      success: 'Device created successfully',
      device,
    };
  } catch (error) {
    console.error('Create device error:', error);
    return {
      error: 'Failed to create device',
    };
  }
}

export async function approveDeviceAction(deviceId: string) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized',
    };
  }

  try {
    deviceOperations.approve(deviceId);
    
    revalidatePath('/admin');
    
    return {
      success: 'Device approved successfully',
    };
  } catch (error) {
    console.error('Approve device error:', error);
    return {
      error: 'Failed to approve device',
    };
  }
}

export async function deleteDeviceAction(deviceId: string) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized',
    };
  }

  try {
    deviceOperations.delete(deviceId);
    
    revalidatePath('/admin');
    
    return {
      success: 'Device deleted successfully',
    };
  } catch (error) {
    console.error('Delete device error:', error);
    return {
      error: 'Failed to delete device',
    };
  }
}

// Helper function to get current user devices
export async function getCurrentUserDevices() {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'agent') {
    return [];
  }

  return deviceOperations.findByAgentId(session.userId);
}

// Helper function to get pending devices (admin only)
export async function getPendingDevices() {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return [];
  }

  return deviceOperations.findPending();
}

// Helper function to get all devices (admin only)
export async function getAllDevices() {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return [];
  }

  return deviceOperations.findAll();
}

// Agent management actions (admin only)
export async function createAgentAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  const rawData = {
    username: formData.get('username') as string,
    password: formData.get('password') as string,
    confirmPassword: formData.get('confirmPassword') as string,
  };

  const validatedData = registerSchema.safeParse(rawData);
  
  if (!validatedData.success) {
    return {
      error: validatedData.error.issues[0].message,
    };
  }

  const { username, password } = validatedData.data;

  try {
    // Check if username already exists
    const existingUser = userOperations.findByUsername(username);
    
    if (existingUser) {
      return {
        error: 'Username already exists',
      };
    }

    // Create new agent user
    await userOperations.create(username, password, 'agent');

    revalidatePath('/admin');
    
    return {
      success: 'Agent created successfully',
    };
  } catch (error) {
    console.error('Create agent error:', error);
    return {
      error: 'An error occurred while creating agent',
    };
  }
}

export async function deleteAgentAction(agentId: string) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  try {
    // Don't allow deleting self
    if (agentId === session.userId) {
      return {
        error: 'Cannot delete your own account',
      };
    }

    userOperations.deleteById(agentId);
    
    revalidatePath('/admin');
    
    return {
      success: 'Agent deleted successfully',
    };
  } catch (error) {
    console.error('Delete agent error:', error);
    return {
      error: 'Failed to delete agent',
    };
  }
}

const changeAgentPasswordSchema = z.object({
  agentId: z.string().min(1, 'Agent ID is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export async function changeAgentPasswordAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  const rawData = {
    agentId: formData.get('agentId') as string,
    newPassword: formData.get('newPassword') as string,
    confirmPassword: formData.get('confirmPassword') as string,
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
    const agent = userOperations.findById(agentId);
    
    if (!agent) {
      return {
        error: 'Agent not found',
      };
    }

    if (agent.role !== 'agent') {
      return {
        error: 'Can only change passwords for agents',
      };
    }

    // Update password
    await userOperations.updatePassword(agentId, newPassword);

    // Invalidate all sessions for this agent to force re-login
    userOperations.invalidateUserSessions(agentId);

    revalidatePath('/admin');
    
    return {
      success: 'Agent password changed successfully. Agent will need to log in again.',
    };
  } catch (error) {
    console.error('Change agent password error:', error);
    return {
      error: 'An error occurred while changing password',
    };
  }
}

export async function transferDeviceOwnershipAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  const deviceId = formData.get('deviceId') as string;
  const newAgentId = formData.get('newAgentId') as string;

  if (!deviceId || !newAgentId) {
    return {
      error: 'Device ID and new agent are required',
    };
  }

  try {
    // Verify device exists
    const device = deviceOperations.findById(deviceId);
    if (!device) {
      return {
        error: 'Device not found',
      };
    }

    // Verify new agent exists and is an agent
    const newAgent = userOperations.findById(newAgentId);
    if (!newAgent) {
      return {
        error: 'New agent not found',
      };
    }

    if (newAgent.role !== 'agent') {
      return {
        error: 'Target user must be an agent',
      };
    }

    // Update device ownership
    deviceOperations.transferOwnership(deviceId, newAgentId);
    
    revalidatePath('/admin');
    
    return {
      success: `Device ownership transferred to ${newAgent.username} successfully`,
    };
  } catch (error) {
    console.error('Transfer device ownership error:', error);
    return {
      error: 'Failed to transfer device ownership',
    };
  }
}

export async function removeDeviceOwnershipAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  const deviceId = formData.get('deviceId') as string;

  if (!deviceId) {
    return {
      error: 'Device ID is required',
    };
  }

  try {
    // Verify device exists
    const device = deviceOperations.findById(deviceId);
    if (!device) {
      return {
        error: 'Device not found',
      };
    }

    // Remove device ownership
    deviceOperations.removeOwnership(deviceId);
    
    revalidatePath('/admin');
    
    return {
      success: 'Device ownership removed successfully',
    };
  } catch (error) {
    console.error('Remove device ownership error:', error);
    return {
      error: 'Failed to remove device ownership',
    };
  }
}

// CSV import validation schema
const csvDeviceSchema = z.object({
  username: z.string().min(1, 'Device username is required').max(50, 'Device username too long'),
  password: z.string().min(1, 'Device password is required').max(100, 'Device password too long'),
});

export async function importDevicesFromCSVAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  const csvData = formData.get('csvData') as string;

  if (!csvData || csvData.trim() === '') {
    return {
      error: 'CSV data is required',
    };
  }

  try {
    const lines = csvData.trim().split('\n');
    const devices: { username: string; password: string }[] = [];
    const errors: string[] = [];
    
    // Parse CSV lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue; // Skip empty lines
      
      const [username, password] = line.split(',').map(s => s.trim());
      
      if (!username || !password) {
        errors.push(`Line ${i + 1}: Invalid format. Expected "username,password"`);
        continue;
      }
      
      // Validate each device
      const validation = csvDeviceSchema.safeParse({ username, password });
      if (!validation.success) {
        errors.push(`Line ${i + 1}: ${validation.error.errors.map((e: any) => e.message).join(', ')}`);
        continue;
      }
      
      devices.push({ username, password });
    }

    if (errors.length > 0) {
      return {
        error: `Validation errors:\n${errors.join('\n')}`,
      };
    }

    if (devices.length === 0) {
      return {
        error: 'No valid devices found in CSV data',
      };
    }

    // Create devices in database
    const createdDevices: string[] = [];
    const creationErrors: string[] = [];

    for (const device of devices) {
      try {
        const deviceId = deviceOperations.create(null, device.username, device.password, 'active');
        createdDevices.push(device.username);
      } catch (error) {
        creationErrors.push(`Failed to create device "${device.username}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    revalidatePath('/admin');

    if (creationErrors.length > 0) {
      return {
        error: `Some devices failed to import:\n${creationErrors.join('\n')}\n\nSuccessfully imported: ${createdDevices.length} devices`,
      };
    }

    return {
      success: `Successfully imported ${createdDevices.length} devices as unowned/pending`,
    };
  } catch (error) {
    console.error('CSV import error:', error);
    return {
      error: 'Failed to process CSV data',
    };
  }
}

export async function createDeviceForAgentAction(formData: FormData) {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return {
      error: 'Unauthorized - admin access required',
    };
  }

  const agentId = formData.get('agentId') as string;
  const agentName = formData.get('agentName') as string;

  if (!agentId || !agentName) {
    return {
      error: 'Agent ID and name are required',
    };
  }

  try {
    // Verify agent exists
    const agent = userOperations.findById(agentId);
    if (!agent) {
      return {
        error: 'Agent not found',
      };
    }

    if (agent.role !== 'agent') {
      return {
        error: 'User must be an agent',
      };
    }

    // Create device for the agent
    const device = deviceOperations.create(agentId, agentName);
    
    revalidatePath('/admin');
    
    return {
      success: `Device created successfully: ${device.username}`,
      device: device,
    };
  } catch (error) {
    console.error('Create device for agent error:', error);
    return {
      error: 'Failed to create device',
    };
  }
}

// Helper function to get all agents (admin only)
export async function getAllAgents() {
  const session = await auth.getSession();
  
  if (!session || session.user.role !== 'admin') {
    return [];
  }

  return userOperations.findAllAgents();
}
