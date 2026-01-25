// Mock data para el MVP - sin base de datos

export interface MockJob {
  id: string
  title: string
  company: string
  description: string
  payment: string
  category: string
  image?: string
  applicants: number
  posted: string
  deadline: string
}

export interface MockUser {
  id: string
  name: string
  email: string
  role: 'creator' | 'company'
  avatar?: string
}

export const mockJobs: MockJob[] = [
  {
    id: '1',
    title: 'TikTok Fashion Brand UGC',
    company: 'StyleCo',
    description: 'Create authentic TikTok content showcasing our summer collection. Must have 10k+ followers and fashion niche.',
    payment: '$500 + $2 CPM',
    category: 'UGC',
    applicants: 23,
    posted: '2 hours ago',
    deadline: '3 days left',
  },
  {
    id: '2',
    title: 'Podcast Clips - Tech Podcast',
    company: 'TechTalk Show',
    description: 'Turn our 2-hour podcast episodes into viral 60-second clips for TikTok and Instagram. Need quick turnaround.',
    payment: '$75 per clip',
    category: 'Clipping',
    applicants: 12,
    posted: '1 hour ago',
    deadline: '2 days left',
  },
  {
    id: '3',
    title: 'YouTube Product Review - Tech Gadgets',
    company: 'TechInnovate',
    description: 'In-depth review of our wireless earbuds. Looking for tech reviewers with authentic style and good production quality.',
    payment: '$800 + performance bonus',
    category: 'Brand Partnership',
    applicants: 8,
    posted: '1 day ago',
    deadline: '5 days left',
  },
  {
    id: '4',
    title: 'Stream Highlights Editor',
    company: 'GamersUnited',
    description: 'Edit gaming stream highlights into short-form content. Looking for someone who understands gaming trends.',
    payment: '$150 per video',
    category: 'Clipping',
    applicants: 31,
    posted: '4 hours ago',
    deadline: '1 week left',
  },
  {
    id: '5',
    title: 'Social Media Manager - Beauty Brand',
    company: 'GlowUp Cosmetics',
    description: 'Manage Instagram and TikTok accounts for beauty brand. Create content calendars and engage with community.',
    payment: '$2500 monthly',
    category: 'Social Management',
    applicants: 67,
    posted: '3 hours ago',
    deadline: '5 days left',
  },
  {
    id: '6',
    title: 'Live Stream Product Demo',
    company: 'FitLife Pro',
    description: 'Host live product demonstration showing our new fitness equipment. Must be comfortable on camera.',
    payment: '$300 per stream',
    category: 'Live Streaming',
    applicants: 19,
    posted: '6 hours ago',
    deadline: '3 days left',
  },
  {
    id: '7',
    title: 'Thumbnail Designer for YouTuber',
    company: 'CreatorStudio',
    description: 'Design eye-catching thumbnails for a 1M+ subscriber YouTube channel. Need fast turnaround times.',
    payment: '$50 per thumbnail',
    category: 'Design',
    applicants: 89,
    posted: '2 hours ago',
    deadline: '1 day left',
  },
  {
    id: '8',
    title: 'Script Writer for TikTok Series',
    company: 'Viral Content Co',
    description: 'Write engaging scripts for educational TikTok series about finance. Must understand Gen Z humor.',
    payment: '$200 per script',
    category: 'Writing',
    applicants: 45,
    posted: '5 hours ago',
    deadline: '1 week left',
  },
  {
    id: '9',
    title: 'Creator Growth Consultant',
    company: 'Independent Creator',
    description: 'Help small creator (50k followers) develop monetization strategy and grow to 100k. One-on-one consulting.',
    payment: '$500 per session',
    category: 'Consulting',
    applicants: 15,
    posted: '1 day ago',
    deadline: '4 days left',
  },
  {
    id: '10',
    title: 'Food UGC Creator - Restaurant Chain',
    company: 'TastyBites',
    description: 'Create mouth-watering UGC content featuring our new menu items. Looking for food content creators with aesthetic feeds.',
    payment: '$800 + free meals',
    category: 'UGC',
    applicants: 56,
    posted: '30 minutes ago',
    deadline: '1 week left',
  },
  {
    id: '11',
    title: 'Gaming Highlights Clipper',
    company: 'ProGamer Studios',
    description: 'Edit gaming tournament highlights into viral clips for social media. Must know current gaming trends and editing software.',
    payment: '$100 per clip',
    category: 'Clipping',
    applicants: 27,
    posted: '2 hours ago',
    deadline: '5 days left',
  },
  {
    id: '12',
    title: 'Long-term Brand Ambassador - Fashion',
    company: 'UrbanStyle Co',
    description: 'Become our brand ambassador for 6 months. Create weekly content, attend events, and represent our brand authentically.',
    payment: '$3000 monthly',
    category: 'Brand Partnership',
    applicants: 19,
    posted: '8 hours ago',
    deadline: '1 week left',
  }
]

export const mockUser: MockUser = {
  id: '1',
  name: 'Maria Rodriguez',
  email: 'maria@example.com',
  role: 'creator',
  avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
}

export const mockStats = {
  totalEarnings: 2847,
  thisMonth: 640,
  totalCampaigns: 12,
  pendingApplications: 3,
  approvalRate: 78
}

export const mockRecentCampaigns = [
  {
    id: '1',
    title: 'TechBrand TikTok',
    views: '2.1K',
    earnings: 180,
    status: 'Completed',
    platform: 'TikTok',
    emoji: '📱'
  },
  {
    id: '2',
    title: 'Fashion UGC',
    views: '5.8K',
    earnings: 320,
    status: 'In Review',
    platform: 'Instagram',
    emoji: '📸'
  },
  {
    id: '3',
    title: 'Beauty Review',
    views: '8.2K',
    earnings: 347,
    status: 'Paid',
    platform: 'YouTube',
    emoji: '🎬'
  }
]

export interface MockGig {
  id: string
  title: string
  description: string
  category: string
  payment_type: string
  fixed_amount?: number
  cpm_rate?: number
  status: string
  created_at: string
  applications_count: number
}

export const mockCompanyGigs: MockGig[] = [
  {
    id: '1',
    title: 'TikTok Fashion Brand UGC',
    description: 'Create authentic TikTok content showcasing our summer collection. Must have 10k+ followers and fashion niche.',
    category: 'TikTok',
    payment_type: 'cpm_fixed',
    fixed_amount: 500,
    cpm_rate: 2,
    status: 'active',
    created_at: '2024-01-20T10:00:00Z',
    applications_count: 23
  },
  {
    id: '2',
    title: 'Instagram Reel - Beauty Products',
    description: 'Create engaging Instagram Reel featuring our new skincare line. Perfect for beauty creators with engaged audience.',
    category: 'Instagram',
    payment_type: 'fixed',
    fixed_amount: 300,
    status: 'active',
    created_at: '2024-01-19T15:30:00Z',
    applications_count: 41
  },
  {
    id: '3',
    title: 'YouTube Product Review - Tech Gadgets',
    description: 'In-depth review of our wireless earbuds. Looking for tech reviewers with authentic style.',
    category: 'YouTube',
    payment_type: 'fixed',
    fixed_amount: 800,
    status: 'completed',
    created_at: '2024-01-18T09:15:00Z',
    applications_count: 12
  }
]

export const mockCompanyUser: MockUser = {
  id: '2',
  name: 'StyleCo Marketing',
  email: 'marketing@styleco.com',
  role: 'company',
}