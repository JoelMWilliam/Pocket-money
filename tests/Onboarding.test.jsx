import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

vi.mock('../src/store/useAppStore', () => {
  const state = {
    auth: { currentUser: null, users: {} },
    categories: [
      { id: 'cat-food', name: 'Food', icon: 'Utensils', color: '#FF9500', type: 'expense' },
      { id: 'cat-salary', name: 'Salary', icon: 'Banknote', color: '#30D158', type: 'income' },
      { id: 'cat-transfer', name: 'Transfer', icon: 'ArrowLeftRight', color: '#8E8E93', type: 'transfer' }
    ],
    accounts: [],
    transactions: [],
    settings: { onboardingComplete: false },
    addCategory: vi.fn(),
    deleteCategory: vi.fn(),
    addAccount: vi.fn(),
    deleteAccount: vi.fn(),
    createUser: vi.fn(async () => {}),
    updateSettings: vi.fn(),
    enableBiometric: vi.fn(async () => {}),
    persistUserData: vi.fn(async () => {}),
    saveAuthState: vi.fn(async () => {}),
    recalculateBalances: vi.fn(),
    rolloverBudgets: vi.fn()
  }
  const fn = vi.fn((selector) => selector ? selector(state) : state)
  fn.getState = () => state
  fn.setState = vi.fn()
  fn.subscribe = vi.fn(() => () => {})
  fn.persist = { onFinishHydration: () => () => {}, hasHydrated: () => true }
  return { useAppStore: fn, registerActivityListeners: vi.fn() }
})

vi.mock('../src/hooks/useTheme', () => ({ useTheme: vi.fn() }))
vi.mock('../src/lib/biometric', () => ({ canUseBiometrics: vi.fn(async () => false) }))
vi.mock('../src/lib/googleDrive', () => ({ signInToGoogleDrive: vi.fn(async () => ({ email: 'test@gmail.com' })), isGoogleDriveConfigured: () => false, initializeGoogleAuth: vi.fn(async () => {}) }))
vi.mock('../src/lib/sms', () => ({ requestSmsPermission: vi.fn(async () => false), checkSmsPermission: vi.fn(async () => false), maybeAutoImportSms: vi.fn(async () => []), isNativeSmsAvailable: vi.fn(() => false), suggestAccountsFromSms: vi.fn(async () => []), checkSmsPermissionHealth: vi.fn(async () => ({ healthy: false, reason: 'non-native' })) }))
vi.mock('../src/lib/notifications', () => ({ requestNotificationPermission: vi.fn(async () => false), scheduleDailyReminder: vi.fn(async () => false), scheduleReportNotification: vi.fn(async () => false) }))
vi.mock('../src/lib/storage', () => ({ storageSet: vi.fn(async () => {}) }))
vi.mock('../src/lib/accountNumber', () => ({ encryptAccountNumber: vi.fn(async () => 'encrypted') }))
vi.mock('../src/lib/icons', () => ({ getIcon: () => () => null }))
vi.mock('../src/components/AvatarPicker', () => ({ default: () => null }))

import Onboarding from '../src/components/Onboarding'

describe('Onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders welcome screen on first load', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    expect(screen.getByText('Pocket Money')).toBeTruthy()
    expect(screen.getByText('Get Started')).toBeTruthy()
  })

  it('navigates from welcome to values screen', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    expect(screen.getByText(/Private by design/)).toBeTruthy()
  })

  it('navigates through values carousel', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    expect(screen.getByText('Private by design')).toBeTruthy()
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Auto-import bank SMS')).toBeTruthy()
    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Understand your money')).toBeTruthy()
  })

  it('navigates from values to theme screen', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText('Make it yours')).toBeTruthy()
  })

  it('shows light/dark toggle on theme screen', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText('Light')).toBeTruthy()
    expect(screen.getByText('Dark')).toBeTruthy()
  })

  it('navigates to choice screen from theme', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText('Create your account')).toBeTruthy()
  })

  it('shows local account option on choice screen', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    expect(screen.getByText('Continue on this device')).toBeTruthy()
    expect(screen.getByText('Continue with Google')).toBeTruthy()
  })

  it('navigates to profile screen when choosing local', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    expect(screen.getByText('Create your profile')).toBeTruthy()
  })

  it('shows error when profile form submitted without name', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.click(screen.getByText('Create Account'))
    expect(screen.getByText('Enter your name')).toBeTruthy()
  })

  it('shows error when PIN is too short', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '123' } })
    fireEvent.change(inputs[1], { target: { value: '123' } })
    fireEvent.click(screen.getByText('Create Account'))
    expect(screen.getByText('PIN must be at least 4 digits')).toBeTruthy()
  })

  it('shows error when PINs do not match', () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '5678' } })
    fireEvent.click(screen.getByText('Create Account'))
    expect(screen.getByText('PINs do not match')).toBeTruthy()
  })

  it('navigates to categories screen after creating profile', async () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test User' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Create Account'))
    await waitFor(() => {
      expect(screen.getByText('Pick your categories')).toBeTruthy()
    })
  })

  it('renders all default categories on categories screen', async () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Create Account'))
    await waitFor(() => {
      expect(screen.getByText('Food')).toBeTruthy()
      expect(screen.getByText('Salary')).toBeTruthy()
      expect(screen.getAllByText('Transfer').length).toBeGreaterThanOrEqual(1)
    })
  })

  it('shows add custom category button on categories screen', async () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Create Account'))
    await waitFor(() => {
      expect(screen.getByText('Add custom category')).toBeTruthy()
    })
  })

  it('renders accounts screen after categories continue', async () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Create Account'))
    await waitFor(() => {
      expect(screen.getByText('Add custom category')).toBeTruthy()
    })
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => {
      expect(screen.getByText('Add your accounts')).toBeTruthy()
    })
  })

  it('renders goal screen after accounts skip', async () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Create Account'))
    await waitFor(() => { expect(screen.getByText('Add custom category')).toBeTruthy() })
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => { expect(screen.getByText('Skip')).toBeTruthy() })
    fireEvent.click(screen.getByText('Skip'))
    await waitFor(() => { expect(screen.getByText('What brings you here?')).toBeTruthy() })
  })

  it('renders goal options on goal screen', async () => {
    render(<Onboarding onComplete={vi.fn()} />)
    fireEvent.click(screen.getByText('Get Started'))
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue'))
    fireEvent.click(screen.getByText('Continue on this device'))
    fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Test' } })
    const inputs = screen.getAllByPlaceholderText(/PIN|Confirm/)
    fireEvent.change(inputs[0], { target: { value: '1234' } })
    fireEvent.change(inputs[1], { target: { value: '1234' } })
    fireEvent.click(screen.getByText('Create Account'))
    await waitFor(() => { expect(screen.getByText('Add custom category')).toBeTruthy() })
    fireEvent.click(screen.getByText('Continue'))
    await waitFor(() => { expect(screen.getByText('Skip')).toBeTruthy() })
    fireEvent.click(screen.getByText('Skip'))
    await waitFor(() => {
      expect(screen.getByText('Save money')).toBeTruthy()
      expect(screen.getByText('Track spending')).toBeTruthy()
      expect(screen.getByText('Pay off debt')).toBeTruthy()
      expect(screen.getByText('Grow wealth')).toBeTruthy()
    })
  })
})
