import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, generateToken } from '@/lib/auth';
import {
  createUser,
  getUserByEmail,
  createSubscription,
  createUserPreferences,
  createUserActivity,
} from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, displayName } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    const user = await createUser(email.toLowerCase(), passwordHash, displayName);

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    // Create subscription (14-day trial)
    const subscription = await createSubscription(user.id);

    // Create user preferences and activity records
    await createUserPreferences(user.id);
    await createUserActivity(user.id);

    // Generate JWT token
    const token = generateToken({ userId: user.id, email: user.email });

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        display_name: user.display_name,
        created_at: user.created_at,
      },
      subscription,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}
