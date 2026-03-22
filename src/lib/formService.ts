import { supabase } from './supabase';

const supabaseNotConfiguredError = {
    success: false,
    error: 'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
};

type StoredFormSubmission = {
  id: string;
  form_type: 'contact' | 'kit_request';
    email: string;
    name: string;
    organization_name?: string | null;
    message: string;
    created_at: string;
};

export type FormType = 'waitlist' | 'partnership' | 'contact';
type RateLimitFormType = FormType | 'kit_request';

const RATE_LIMITS: Record<RateLimitFormType, { windowMs: number; max: number }> = {
    waitlist: { windowMs: 10 * 60 * 1000, max: 3 },
    partnership: { windowMs: 10 * 60 * 1000, max: 3 },
    contact: { windowMs: 10 * 60 * 1000, max: 3 },
    kit_request: { windowMs: 10 * 60 * 1000, max: 2 },
};

const getRateLimitError = (retryAfterMs: number) => {
    const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return `Please wait ${seconds}s before submitting again.`;
};

const checkRateLimit = (formType: RateLimitFormType): { allowed: boolean; error?: string } => {
    if (typeof window === 'undefined') {
        return { allowed: true };
    }

    const config = RATE_LIMITS[formType];
    const storageKey = `stemise:rate_limit:${formType}`;
    const now = Date.now();
    let entries: number[] = [];

    try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
            entries = JSON.parse(raw);
        }
    } catch {
        entries = [];
    }

    const recentEntries = entries.filter((timestamp) => now - timestamp < config.windowMs);

    if (recentEntries.length >= config.max) {
        const retryAfterMs = config.windowMs - (now - recentEntries[0]);
        return { allowed: false, error: getRateLimitError(retryAfterMs) };
    }

    const nextEntries = [...recentEntries, now];
    try {
        window.localStorage.setItem(storageKey, JSON.stringify(nextEntries));
    } catch {
        // Ignore storage failures and allow submission.
    }

    return { allowed: true };
};

interface WaitlistData {
    email: string;
}

interface PartnershipData {
    organizationName: string;
    contactPerson: string;
    email: string;
    interestArea: string;
    message: string;
}

interface ContactData {
    name: string;
    email: string;
    message: string;
    captchaToken: string;
}

async function submitProtectedFormSubmission(data: {
    formType: 'contact' | 'kit_request';
    email: string;
    name: string;
    organizationName?: string | null;
    message: string;
    captchaToken: string;
}): Promise<{ success: boolean; error?: string; record?: StoredFormSubmission }> {
    if (!supabase) {
        return supabaseNotConfiguredError;
    }

    const { data: response, error } = await supabase.functions.invoke('submit-form', {
        body: {
            form_type: data.formType,
            email: data.email,
            name: data.name,
            organization_name: data.organizationName ?? null,
            message: data.message,
            captcha_token: data.captchaToken,
        },
    });

    if (error) {
        console.error(`${data.formType} submission error:`, error);
        return { success: false, error: error.message };
    }

    if (!response?.success) {
        return { success: false, error: response?.error || 'Please try again later.' };
    }

    return { success: true, record: response.record };
}

/**
 * Submit a waitlist signup to Supabase
 */
export async function submitWaitlist(data: WaitlistData): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return supabaseNotConfiguredError;
    }
    const rateLimit = checkRateLimit('waitlist');
    if (!rateLimit.allowed) {
        return { success: false, error: rateLimit.error };
    }
    const { error } = await supabase
        .from('form_submissions')
        .insert({
            form_type: 'waitlist',
            email: data.email,
        });

    if (error) {
        console.error('Waitlist submission error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Submit a partnership inquiry to Supabase
 */
export async function submitPartnershipInquiry(data: PartnershipData): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return supabaseNotConfiguredError;
    }
    const rateLimit = checkRateLimit('partnership');
    if (!rateLimit.allowed) {
        return { success: false, error: rateLimit.error };
    }
    const { error } = await supabase
        .from('form_submissions')
        .insert({
            form_type: 'partnership',
            email: data.email,
            organization_name: data.organizationName,
            contact_person: data.contactPerson,
            interest_area: data.interestArea,
            message: data.message,
        });

    if (error) {
        console.error('Partnership submission error:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Submit a contact form message to Supabase
 */
export async function submitContactMessage(data: ContactData): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return supabaseNotConfiguredError;
    }
    const rateLimit = checkRateLimit('contact');
    if (!rateLimit.allowed) {
        return { success: false, error: rateLimit.error };
    }
    const result = await submitProtectedFormSubmission({
        formType: 'contact',
        email: data.email,
        name: data.name,
        message: data.message,
        captchaToken: data.captchaToken,
    });

    return { success: result.success, error: result.error };
}

interface KitRequestData {
    name: string;
    email: string;
    organization: string;
    message: string;
    captchaToken: string;
    kits: Array<{ name: string; quantity: number }>;
}

/**
 * Submit a STEM kit request to Supabase
 */
export async function submitKitRequest(data: KitRequestData): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
        return supabaseNotConfiguredError;
    }
    const rateLimit = checkRateLimit('kit_request');
    if (!rateLimit.allowed) {
        return { success: false, error: rateLimit.error };
    }
    const kitsDescription = data.kits.map(k => `${k.name} x${k.quantity}`).join(', ');

    const result = await submitProtectedFormSubmission({
        formType: 'kit_request',
        email: data.email,
        name: data.name,
        organizationName: data.organization,
        message: `KITS REQUESTED: ${kitsDescription}\n\nMESSAGE: ${data.message}`,
        captchaToken: data.captchaToken,
    });

    return { success: result.success, error: result.error };
}
