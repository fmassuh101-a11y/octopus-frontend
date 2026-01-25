const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001'

export class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.detail || error.message || 'Request failed')
    }

    return response.json()
  }

  // Auth methods
  async login(email: string, password: string) {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)

    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Invalid email or password')
    }

    return response.json()
  }

  async register(userData: {
    email: string
    username: string
    password: string
    full_name: string
    user_type: string
    // Campos adicionales para onboarding
    country?: string
    phone_number?: string
    // Para creators
    experience_level?: string
    // Para companies
    company_name?: string
    company_type?: string
    company_description?: string
    payment_options?: any
  }) {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async getCurrentUser() {
    return this.request('/api/auth/me')
  }

  // Tasks methods
  async getTasks(params: { skip?: number; limit?: number; category_id?: number; task_type?: string } = {}) {
    const queryParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) queryParams.append(key, value.toString())
    })

    return this.request(`/api/tasks/?${queryParams}`)
  }

  async getMyTasks() {
    return this.request('/api/tasks/my')
  }

  async getTask(taskId: string) {
    return this.request(`/api/tasks/${taskId}`)
  }

  async createTask(taskData: {
    title: string
    description: string
    task_type: string
    category_id: number
    budget_min?: number
    budget_max?: number
    deadline?: string
    files_required?: boolean
  }) {
    return this.request('/api/tasks/', {
      method: 'POST',
      body: JSON.stringify(taskData),
    })
  }

  async updateTask(taskId: string, taskData: any) {
    return this.request(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    })
  }

  // Categories methods
  async getCategories() {
    return this.request('/api/categories/')
  }

  // Applications methods
  async createApplication(taskId: string, applicationData: {
    message: string
    proposed_price?: number
    estimated_delivery?: number
    portfolio_links?: any
  }) {
    return this.request('/api/applications/', {
      method: 'POST',
      body: JSON.stringify({
        task_id: taskId,
        ...applicationData,
      }),
    })
  }

  // Orders methods
  async getMyOrders() {
    return this.request('/api/orders/')
  }

  async getOrder(orderId: string) {
    return this.request(`/api/orders/${orderId}`)
  }
}

export const api = new ApiClient()