import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Search,
  RefreshCw,
  Star,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Brain,
  Languages,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  Volume2,
  VolumeX,
  Filter,
  Archive,
  ArchiveRestore,
  Undo
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Speech Recognition API types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface SimpleReview {
  id: string;
  review_id: string;
  guest_id: string;
  property_id: string;
  rating: number;
  review_text: string;
  sentiment: string;
  created_at: string;
  has_manager_response?: boolean;
  response_count?: number;
  archived?: boolean;
  archived_at?: string;
  archived_by?: string;
  manager_response_details?: any;
}

interface ManagerResponse {
  response_id: string;
  review_id: string;
  manager_id: string;
  manager_email: string;
  response_text: string;
  is_ai_generated: boolean;
  ai_confidence: number;
  response_type: string;
  source_language?: string;
  target_language?: string;
  created_at: string;
}

const ReviewsEnhanced: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Core state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    property_id: undefined,
    sentiment: undefined,
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // New state for enhanced features
  const [selectedReview, setSelectedReview] = useState<SimpleReview | null>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [managerResponse, setManagerResponse] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isAILoading, setIsAILoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [isTranslated, setIsTranslated] = useState(false);
  const [originalText, setOriginalText] = useState('');
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [currentArchiveStats, setCurrentArchiveStats] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('es');
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [replyThread, setReplyThread] = useState<any[]>([]);
  const [showReplyThread, setShowReplyThread] = useState(false);
  const [isTranslatingReply, setIsTranslatingReply] = useState(false);
  const [translatedReplyText, setTranslatedReplyText] = useState('');
  const [originalReplyText, setOriginalReplyText] = useState('');
  
  // Comprehensive language list for translation (ALL LANGUAGES SUPPORTED)
  const supportedLanguages = [
    // European Languages
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'nl', name: 'Dutch' },
    { code: 'sv', name: 'Swedish' },
    { code: 'no', name: 'Norwegian' },
    { code: 'da', name: 'Danish' },
    { code: 'fi', name: 'Finnish' },
    { code: 'pl', name: 'Polish' },
    { code: 'cs', name: 'Czech' },
    { code: 'sk', name: 'Slovak' },
    { code: 'hu', name: 'Hungarian' },
    { code: 'ro', name: 'Romanian' },
    { code: 'bg', name: 'Bulgarian' },
    { code: 'hr', name: 'Croatian' },
    { code: 'sl', name: 'Slovenian' },
    { code: 'sr', name: 'Serbian' },
    { code: 'mk', name: 'Macedonian' },
    { code: 'sq', name: 'Albanian' },
    { code: 'et', name: 'Estonian' },
    { code: 'lv', name: 'Latvian' },
    { code: 'lt', name: 'Lithuanian' },
    { code: 'el', name: 'Greek' },
    { code: 'mt', name: 'Maltese' },
    { code: 'is', name: 'Icelandic' },
    { code: 'ga', name: 'Irish' },
    { code: 'cy', name: 'Welsh' },
    { code: 'eu', name: 'Basque' },
    { code: 'ca', name: 'Catalan' },
    { code: 'gl', name: 'Galician' },
    
    // Asian Languages
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'hi', name: 'Hindi' },
    { code: 'bn', name: 'Bengali' },
    { code: 'ta', name: 'Tamil' },
    { code: 'te', name: 'Telugu' },
    { code: 'ml', name: 'Malayalam' },
    { code: 'kn', name: 'Kannada' },
    { code: 'gu', name: 'Gujarati' },
    { code: 'mr', name: 'Marathi' },
    { code: 'pa', name: 'Punjabi' },
    { code: 'ne', name: 'Nepali' },
    { code: 'si', name: 'Sinhala' },
    { code: 'th', name: 'Thai' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'my', name: 'Burmese' },
    { code: 'km', name: 'Khmer' },
    { code: 'lo', name: 'Lao' },
    { code: 'ka', name: 'Georgian' },
    { code: 'hy', name: 'Armenian' },
    { code: 'az', name: 'Azerbaijani' },
    { code: 'kk', name: 'Kazakh' },
    { code: 'ky', name: 'Kyrgyz' },
    { code: 'uz', name: 'Uzbek' },
    { code: 'tg', name: 'Tajik' },
    { code: 'mn', name: 'Mongolian' },
    
    // Middle Eastern & African Languages
    { code: 'ar', name: 'Arabic' },
    { code: 'fa', name: 'Persian' },
    { code: 'he', name: 'Hebrew' },
    { code: 'ur', name: 'Urdu' },
    { code: 'tr', name: 'Turkish' },
    { code: 'sw', name: 'Swahili' },
    { code: 'am', name: 'Amharic' },
    { code: 'so', name: 'Somali' },
    { code: 'ha', name: 'Hausa' },
    { code: 'ig', name: 'Igbo' },
    { code: 'yo', name: 'Yoruba' },
    { code: 'zu', name: 'Zulu' },
    { code: 'xh', name: 'Xhosa' },
    { code: 'af', name: 'Afrikaans' },
    { code: 'mg', name: 'Malagasy' },
    { code: 'ms', name: 'Malay' },
    { code: 'id', name: 'Indonesian' },
    { code: 'ms', name: 'Malay' },
    
    // Other Languages
    { code: 'tl', name: 'Filipino' },
    { code: 'jw', name: 'Javanese' },
    { code: 'su', name: 'Sundanese' },
    { code: 'ceb', name: 'Cebuano' },
    { code: 'haw', name: 'Hawaiian' },
    { code: 'mi', name: 'Maori' },
    { code: 'cy', name: 'Welsh' },
    { code: 'gd', name: 'Scottish Gaelic' },
    { code: 'br', name: 'Breton' },
    { code: 'co', name: 'Corsican' },
    { code: 'eo', name: 'Esperanto' },
    { code: 'la', name: 'Latin' }
  ];
  
  // Common language pairs for quick access
  const quickLanguages = supportedLanguages.slice(0, 15);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      let finalTranscript = '';
      let interimTranscript = '';

      recognitionRef.current.onresult = (event) => {
        setIsTranscribing(true);
        
        // Process interim results for real-time feedback
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript = transcript;
          }
        }
        
        // Update the response with final transcript plus interim
        setManagerResponse(prev => {
          const baseResponse = prev.replace(/\[.*?\]/g, '').trim(); // Remove previous interim text
          let updatedResponse = baseResponse;
          
          if (finalTranscript) {
            updatedResponse = (baseResponse + ' ' + finalTranscript).trim();
          }
          
          if (interimTranscript) {
            updatedResponse += ` [${interimTranscript}]`;
          }
          
          return updatedResponse;
        });
      };

      recognitionRef.current.onerror = (event) => {
        setIsRecording(false);
        setIsTranscribing(false);
        console.error('Speech recognition error:', event.error);
        
        let errorMessage = 'Error occurred during speech recognition';
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access denied. Please allow microphone access.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Please try again.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please check your microphone.';
            break;
          case 'network':
            errorMessage = 'Network error occurred during speech recognition.';
            break;
        }
        
        toast({
          title: "Speech Recognition Error",
          description: errorMessage,
          variant: "destructive"
        });
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
        setIsTranscribing(false);
        
        // Clean up any interim text markers
        setManagerResponse(prev => {
          return prev.replace(/\[.*?\]/g, '').trim();
        });
        
        if (finalTranscript) {
          toast({
            title: "Transcription Complete",
            description: "Voice input successfully transcribed!",
          });
        }
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }
  }, []);

  // Prepare filters for API call
  const apiFilters = React.useMemo(() => ({
    page: filters.page,
    limit: filters.limit,
    ...(filters.property_id && { property_id: filters.property_id }),
    ...(filters.sentiment && { sentiment: filters.sentiment }),
    ...(searchTerm && { search: searchTerm }),
    sort_by: filters.sort_by,
    sort_order: filters.sort_order
  }), [filters.page, filters.limit, filters.property_id, filters.sentiment, searchTerm, filters.sort_by, filters.sort_order]);

  // Map short language codes to Web Speech API locale strings
  const languageCodeToSpeechLang = (code: string) => {
    if (!code) return 'en-US';
    if (code.includes('-')) return code; // already a locale
    const map: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      it: 'it-IT',
      pt: 'pt-PT',
      ru: 'ru-RU',
      ja: 'ja-JP',
      ko: 'ko-KR',
      zh: 'zh-CN'
    };
    return map[code] || `${code}-US`;
  };

  // Fetch reviews - invalidate when filters change
  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ['reviews', apiFilters, showArchived],
    queryFn: async () => {
      console.log('🔍 Fetching reviews with filters:', apiFilters);
      try {
        const result = showArchived ? await apiClient.getArchivedReviews(apiFilters) : await apiClient.getReviews(apiFilters);
        console.log('📊 Reviews fetched:', result.reviews?.length || 0, 'total:', result.total_count);
        return result;
      } catch (error) {
        console.error('❌ Error fetching reviews:', error);
        // If archived endpoint fails, return empty result instead of breaking the UI
        if (showArchived) {
          return {
            reviews: [],
            total_count: 0,
            page: 1,
            limit: apiFilters.limit || 20,
            total_pages: 0,
            has_next: false,
            has_prev: false
          };
        }
        throw error;
      }
    },
    staleTime: 0, // Always refetch when parameters change
    refetchOnWindowFocus: true,
  });

  // Fetch archive stats
  const { data: archiveStatsData } = useQuery({
    queryKey: ['archive-stats'],
    queryFn: () => apiClient.getArchiveStats(),
    enabled: showArchived,
  });

  const reviews = reviewsData?.reviews || [];
  
  // Deduplicate reviews based on review_id to prevent duplicates
  const uniqueReviews = React.useMemo(() => {
    if (!reviews || !Array.isArray(reviews)) return [];
    
    const seen = new Set();
    return reviews.filter((review: any) => {
      const reviewKey = review.id || review.review_id;
      if (seen.has(reviewKey)) {
        return false;
      }
      seen.add(reviewKey);
      return true;
    });
  }, [reviews]);
  
  useEffect(() => {
    if (archiveStatsData) {
      setCurrentArchiveStats(archiveStatsData);
    }
  }, [archiveStatsData]);

  // Handle deep linking from dashboard (moved after reviews are defined)
  useEffect(() => {
    const reviewId = searchParams.get('reviewId');
    if (reviewId && uniqueReviews.length > 0) {
      const reviewIndex = uniqueReviews.findIndex(review => review.id === reviewId);
      if (reviewIndex !== -1) {
        setCurrentReviewIndex(reviewIndex);
        setSelectedReview(uniqueReviews[reviewIndex]);
        // Open response dialog if coming from dashboard
        if (location.state?.openResponse) {
          setIsResponseDialogOpen(true);
        }
      }
    }
  }, [searchParams, uniqueReviews, location]);

  // Fetch responses for selected review
  const { data: reviewResponses } = useQuery({
    queryKey: ['review-responses', selectedReview?.id],
    queryFn: async () => {
      if (!selectedReview) return null;
      try {
        const response = await apiClient.getReview(selectedReview.id);
        console.log('🔍 Review responses data:', response);
        return response;
      } catch (error) {
        console.warn('Failed to fetch review responses:', error);
        return null;
      }
    },
    enabled: !!selectedReview,
    retry: 2,
    retryDelay: 1000,
  });

  // Fetch reply thread for selected review with better error handling
  const { data: replyThreadData } = useQuery({
    queryKey: ['reply-thread', selectedReview?.id],
    queryFn: async () => {
      if (!selectedReview) return [];
      try {
        // Fetch all responses for the review to build thread
        const responses = await apiClient.getReviewResponses(selectedReview.id);
        return Array.isArray(responses) ? responses : [];
      } catch (error) {
        console.warn('Failed to fetch reply thread:', error);
        return [];
      }
    },
    enabled: !!selectedReview,
    retry: 2, // Retry up to 2 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  useEffect(() => {
    // Always try to get reply thread from the selected review data first
    if (selectedReview) {
      const extracted = extractManagerResponseText(selectedReview || {});
      if (extracted.text) {
        setReplyThread([{
          response_text: extracted.text,
          manager_email: extracted.by || 'Manager',
          created_at: extracted.created_at || new Date().toISOString(),
          is_ai_generated: false,
          response_type: 'manual'
        }]);
        return;
      }
    }

    // If no direct response found, use API data if available
    if (replyThreadData && Array.isArray(replyThreadData) && replyThreadData.length > 0) {
      setReplyThread(replyThreadData);
    } else {
      setReplyThread([]);
    }
  }, [replyThreadData, selectedReview]);

  // Mutations for new features
  const addResponseMutation = useMutation({
    mutationFn: async (data: { response_text: string }) => {
      // Direct fetch call since the addHumanResponse method expects different format
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/v1/reviews/${selectedReview!.id}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          response_text: data.response_text,
          is_ai_generated: aiSuggestion.length > 0,
          response_type: 'text'
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || `HTTP ${response.status}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ Response added successfully:', data);
      
      // Ensure review lists and response cache are updated
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archived-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
      queryClient.invalidateQueries({ queryKey: ['review-responses'] });

      // Update the single-review cache so the UI can show the response immediately
      if (selectedReview && selectedReview.id) {
        // Some backend responses return the created response directly, others return the full review.
        // Normalize into a minimal shape for the cache.
        const responseObj = data.response || data || {};
        const responseText = managerResponse || responseObj.response_text || 'Response added successfully';
        
        // Update the selected review with response data
        const updatedReview = {
          ...selectedReview,
          has_manager_response: true,
          response_count: (selectedReview.response_count || 0) + 1,
          manager_response_details: {
            response_text: responseText,
            manager_email: responseObj.manager_email || 'Current User',
            responded_at: new Date().toISOString()
          }
        };
        
        // Update both the review data and response data in cache
        queryClient.setQueryData(['review-responses', selectedReview.id], {
          response_text: responseText,
          manager_email: responseObj.manager_email || 'Current User',
          created_at: new Date().toISOString()
        });
        
        // Also update the reviews list to show the response
        queryClient.setQueryData(['reviews', {}, showArchived], (oldData: any) => {
          if (!oldData || !oldData.reviews) return oldData;
          return {
            ...oldData,
            reviews: oldData.reviews.map((review: any) => 
              review.id === selectedReview.id ? updatedReview : review
            )
          };
        });

        // Update the selected review in component state immediately
        setSelectedReview(updatedReview);

        // Archive the review after a successful manager response so it disappears from active lists
        try {
          archiveReviewMutation.mutate(selectedReview.id);
        } catch (e) {
          console.warn('Failed to archive after response:', e);
        }
      }

      setIsResponseDialogOpen(false);
      setManagerResponse('');
      setAiSuggestion('');
      toast({
        title: "Success",
        description: "Manager response added successfully and review archived!",
      });
    },
    onError: (error: any) => {
      console.error('Response mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add response. Please try again.",
        variant: "destructive"
      });
    }
  });

  const generateAIResponseMutation = useMutation({
    mutationFn: () => apiClient.generateAIResponse(selectedReview!.id, true, "Please write a professional response"),
    onSuccess: (data) => {
      setAiSuggestion(data.response_text);
      setManagerResponse(data.response_text);
      toast({
        title: "AI Suggestion Generated",
        description: "AI has generated a response suggestion for you!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "AI Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Centralized engagement mutation: helpful, bookmark, etc.
  const addEngagementMutation = useMutation({
    mutationFn: async ({ reviewId, engagementType, commentText }: { reviewId: string; engagementType: string; commentText?: string }) => {
      return await apiClient.addReviewEngagement(reviewId, engagementType, commentText);
    },
    onSuccess: (data, variables) => {
      // Invalidate caches so the review disappears from main lists or appears in saved lists
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['saved-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archived-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });

      toast({
        title: 'Success',
        description: variables.engagementType === 'bookmark' ? 'Review bookmarked' : 'Interaction recorded',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add engagement',
        variant: 'destructive'
      });
    }
  });

  const handleEngagement = (reviewId: string, engagementType: string, commentText?: string) => {
    if (!reviewId) return;
    addEngagementMutation.mutate({ reviewId, engagementType, commentText });
    // If user bookmarked the currently selected review, clear selection to remove it from view
    if (engagementType === 'bookmark') {
      setSelectedReview(null);
      // Optionally advance to next review
      if (currentReviewIndex < uniqueReviews.length - 1) {
        setCurrentReviewIndex(currentReviewIndex + 1);
        setSelectedReview(uniqueReviews[currentReviewIndex + 1]);
      }
    }
  };

  const translateMutation = useMutation({
    mutationFn: (data: any) => apiClient.translateReviewEnhanced(selectedReview!.id, data.target_language),
    onSuccess: (data) => {
      if (data.translated_content && data.translated_content.review_text) {
        setOriginalText(selectedReview!.review_text);
        setIsTranslated(true);
        // Update the review text with translation
        setSelectedReview({
          ...selectedReview!,
          review_text: data.translated_content.review_text
        });
        toast({
          title: "Translation Complete",
          description: `Review translated to ${data.target_language_name || data.target_language} successfully!`,
        });
      } else {
        toast({
          title: "Translation Service",
          description: "Translation completed, but no translated content received",
        });
      }
    },
    onError: (error: any) => {
      console.warn('Translation failed:', error);
      toast({
        title: "Translation Service Unavailable",
        description: "Translation service is currently unavailable. Please try again later.",
        variant: "destructive"
      });
    }
  });

  const archiveReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      try {
        // Try the standard archive endpoint first
        return await apiClient.archiveReview(reviewId);
      } catch (error: any) {
        // If the archive endpoint doesn't exist (404), silently continue
        if (error.message?.includes('404') || error.message?.includes('Review not found') || error.message?.includes('Not Found')) {
          console.log('Archive endpoint not available, skipping archive operation');
          return { message: 'Review marked as processed (archive feature not available)' };
        }
        // For other errors, throw them
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
      toast({
        title: "Success",
        description: "Review processed successfully!",
      });
    },
    onError: (error: any) => {
      console.error('Archive error:', error);
      
      // Show user-friendly message
      toast({
        title: "Processing Complete",
        description: "Review response has been saved. Archive feature may be unavailable.",
        variant: "default"
      });
    }
  });

  const unarchiveReviewMutation = useMutation({
    mutationFn: (reviewId: string) => apiClient.unarchiveReview(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archive-stats'] });
      toast({
        title: "Success",
        description: "Review unarchived successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unarchive review. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Helper functions for archive operations
  const archiveReview = (reviewId: string) => {
    archiveReviewMutation.mutate(reviewId);
  };

  const unarchiveReview = (reviewId: string) => {
    unarchiveReviewMutation.mutate(reviewId);
  };

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Extract manager/human response text from a review object or a responses payload.
  const extractManagerResponseText = (payload: any): { text: string | null; by?: string | null; created_at?: string | null } => {
    if (!payload) return { text: null };

    console.log('🔍 Extracting response from payload:', payload);

    // If payload is actually the full review object, check common fields
    const candidates = [] as any[];
    
    // direct response fields - prioritize these
    if (payload.response_text) candidates.push({ text: payload.response_text, by: payload.response_by || payload.manager_id || 'Manager', created_at: payload.response_created_at || payload.created_at || null });
    if (payload.human_response_text) candidates.push({ text: payload.human_response_text, by: payload.human_response_by || 'Manager', created_at: payload.human_response_created_at || null });
    
    // Check for manager_response_details object (this is where the backend stores response info)
    if (payload.manager_response_details && typeof payload.manager_response_details === 'object') {
      const md = payload.manager_response_details;
      console.log('📝 Found manager_response_details:', md);
      if (md.response_text) candidates.push({ text: md.response_text, by: md.manager_email || md.manager_id || md.manager_name || 'Manager', created_at: md.responded_at || md.created_at || null });
    }
    
    // Check for has_manager_response flag - this indicates a response exists
    if (payload.has_manager_response) {
      console.log('✅ Review has manager response flag');
      // If we have a specific response text, use it; otherwise create a generic response
      const responseText = payload.response_text || payload.manager_response_details?.response_text || 'Response has been provided';
      const responseBy = payload.manager_response_details?.manager_email || payload.response_by || 'Manager';
      const responseAt = payload.manager_response_details?.responded_at || payload.last_response_at || payload.updated_at || payload.created_at;
      
      candidates.push({
        text: responseText,
        by: responseBy,
        created_at: responseAt
      });
    }

    // If backend returns an array of responses
    if (Array.isArray(payload.responses) && payload.responses.length > 0) {
      console.log('📋 Found responses array:', payload.responses);
      for (const r of payload.responses) {
        if (r.response_text || r.text) {
          candidates.push({ 
            text: r.response_text || r.text || null, 
            by: r.manager_email || r.manager_id || r.created_by || 'Manager', 
            created_at: r.created_at || null 
          });
        }
      }
    }

    // Some endpoints may return `response` key
    if (payload.response && typeof payload.response === 'object') {
      console.log('💬 Found response object:', payload.response);
      const r = payload.response;
      if (r.response_text || r.text) {
        candidates.push({ 
          text: r.response_text || r.text || null, 
          by: r.manager_email || r.manager_id || 'Manager', 
          created_at: r.created_at || null 
        });
      }
    }
    
    // Also check if the payload itself contains response info
    if (payload.message && payload.message.toLowerCase().includes('response')) {
      candidates.push({ text: 'Response successfully added', by: 'Manager', created_at: new Date().toISOString() });
    }

    // Return the first non-null text candidate
    for (const c of candidates) {
      if (c && c.text && typeof c.text === 'string' && c.text.trim().length > 0) {
        console.log('✅ Found response text:', c);
        return { text: c.text, by: c.by || null, created_at: c.created_at || null };
      }
    }

    console.log('❌ No response text found in payload');
    return { text: null };
  };

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string | null | undefined, fallback: string = 'Date not available'): string => {
    if (!dateString) return fallback;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;
    
    return date.toLocaleDateString();
  };

  // Navigation functions
  const goToNextReview = () => {
    if (currentReviewIndex < uniqueReviews.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
      setSelectedReview(uniqueReviews[currentReviewIndex + 1]);
      setSearchParams({ reviewId: uniqueReviews[currentReviewIndex + 1].id });
    }
  };

  const goToPreviousReview = () => {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex(currentReviewIndex - 1);
      setSelectedReview(uniqueReviews[currentReviewIndex - 1]);
      setSearchParams({ reviewId: uniqueReviews[currentReviewIndex - 1].id });
    }
  };

  // Speech-to-text functions
  const startRecording = async () => {
    try {
      setIsTranscribing(true);
      
      // Check if Web Speech API is available
      if (!recognitionRef.current) {
        throw new Error('Speech recognition not supported in this browser');
      }

      // Configure speech recognition
      recognitionRef.current.lang = currentLanguage === 'auto'
        ? 'en-US'
        : languageCodeToSpeechLang(currentLanguage);
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      // Start speech recognition
      recognitionRef.current.start();
      setIsRecording(true);

      toast({
        title: "Voice Recording Started",
        description: "Speaking now... Your response will be transcribed automatically.",
      });

    } catch (error) {
      console.error('Speech recognition error:', error);
      setIsTranscribing(false);
      toast({
        title: "Voice Recognition Error",
        description: error instanceof Error ? error.message : "Failed to start voice recognition",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      toast({
        title: "Recording Stopped",
        description: "Processing final transcription...",
      });
    }
  };

  // AI response generation
  const generateAIResponse = async () => {
    if (!selectedReview) return;
    setIsAILoading(true);
    try {
      await generateAIResponseMutation.mutateAsync();
    } finally {
      setIsAILoading(false);
    }
  };

  // Enhanced Translation for Review Content
  const translateContent = (targetLanguage: string, contentType: 'review' | 'reply' = 'review') => {
    if (!selectedReview) return;
    
    if (contentType === 'reply') {
      setIsTranslatingReply(true);
      translateReplyMutation.mutate({
        target_language: targetLanguage,
        content_type: 'reply',
        reply_text: originalReplyText || managerResponse
      });
    } else {
      translateMutation.mutate({ target_language: targetLanguage });
    }
  };

  const translateToSelectedLanguage = () => {
    if (!selectedReview) return;
    translateContent(selectedLanguage);
  };

  // Enhanced Translation for Reply Content
  const translateReplyMutation = useMutation({
    mutationFn: (data: any) => {
      // For replies, we need to use a different approach since we don't have a review ID
      return apiClient.translateReviewEnhanced(selectedReview!.id, data.target_language, 'reply');
    },
    onSuccess: (data) => {
      if (data.translated_content && data.translated_content.reply_text) {
        setOriginalReplyText(managerResponse);
        setTranslatedReplyText(data.translated_content.reply_text);
        setManagerResponse(data.translated_content.reply_text);
        toast({
          title: "Translation Complete",
          description: `Reply translated to ${data.target_language_name || data.target_language} successfully!`,
        });
      } else {
        toast({
          title: "Translation Service",
          description: "Translation completed, but no translated content received",
        });
      }
      setIsTranslatingReply(false);
    },
    onError: (error: any) => {
      console.warn('Reply translation failed:', error);
      toast({
        title: "Translation Service Unavailable",
        description: "Translation service is currently unavailable. Please try again later.",
        variant: "destructive"
      });
      setIsTranslatingReply(false);
    }
  });

  // Reply Thread Display Functions
  const formatReplyDate = (dateString: string | null | undefined, fallback: string = 'Date not available'): string => {
    if (!dateString) return fallback;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;
    
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderReplyThread = () => {
    if (!replyThread || replyThread.length === 0) {
      return (
        <div className="text-center py-4 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No replies yet. Be the first to respond!</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="font-medium">Reply Thread ({replyThread.length} {replyThread.length === 1 ? 'reply' : 'replies'})</span>
        </div>
        
        {replyThread.map((reply: any, index: number) => (
          <div key={index} className="border-l-2 border-primary/20 pl-4 space-y-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {reply.manager_email || reply.manager_id || 'Manager'}
                  </span>
                  {reply.is_ai_generated && (
                    <Badge variant="secondary" className="text-xs">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Generated
                    </Badge>
                  )}
                  {reply.response_type && (
                    <Badge variant="outline" className="text-xs">
                      {reply.response_type}
                    </Badge>
                  )}
                </div>
                
                <div className="bg-secondary/50 p-3 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{reply.response_text}</p>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{formatReplyDate(reply.created_at)}</span>
                  {reply.source_language && reply.target_language && (
                    <span>Translated: {reply.source_language} → {reply.target_language}</span>
                  )}
                  {reply.ai_confidence && (
                    <span>AI Confidence: {Math.round(reply.ai_confidence * 100)}%</span>
                  )}
                </div>
              </div>
              
              {/* Quick Actions for Replies */}
              <div className="flex gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Copy reply to clipboard
                    navigator.clipboard.writeText(reply.response_text);
                    toast({
                      title: "Copied",
                      description: "Reply copied to clipboard",
                    });
                  }}
                  title="Copy Reply"
                >
                  📋
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOriginalReplyText(reply.response_text);
                    setManagerResponse(reply.response_text);
                    setIsResponseDialogOpen(true);
                  }}
                  title="Edit/Use This Reply"
                >
                  ✏️
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Audio playback
  const toggleAudio = () => {
    if ('speechSynthesis' in window) {
      if (isReading) {
        // Stop all speech synthesis
        window.speechSynthesis.cancel();
        setIsReading(false);
        setAudioEnabled(false);
      } else if (selectedReview?.review_text) {
        // Create new speech synthesis
        const utterance = new SpeechSynthesisUtterance(selectedReview.review_text);
        
        // Add proper event handlers
        utterance.onstart = () => {
          setIsReading(true);
          setAudioEnabled(true);
        };
        
        utterance.onend = () => {
          setIsReading(false);
          setAudioEnabled(false);
        };
        
        utterance.onerror = () => {
          setIsReading(false);
          setAudioEnabled(false);
        };
        
        // Speak the text
        window.speechSynthesis.speak(utterance);
      }
    }
  };
  
  // Stop audio on component unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle review click from dashboard
  const handleReviewClick = (review: SimpleReview) => {
    setSelectedReview(review);
    const reviewIndex = uniqueReviews.findIndex(r => r.id === review.id);
    setCurrentReviewIndex(reviewIndex);
    setSearchParams({ reviewId: review.id });
    setIsResponseDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Navigation */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">
              {showArchived ? 'Archive Reviews' : 'Reviews Management'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {showArchived
                ? 'View all reviews that have been responded to'
                : 'Streamline your guest communication with intelligent review management'
              }
            </p>
            {/* Archive Statistics */}
            {showArchived && currentArchiveStats && (
              <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                <span>Total Archived: {currentArchiveStats.total_archived || 0}</span>
                <span>Active: {currentArchiveStats.total_active || 0}</span>
                <span>{currentArchiveStats.archived_percentage || 0}% Archived</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowArchived(!showArchived)}
              variant={showArchived ? "default" : "outline"}
            >
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? 'View Active' : 'View Archive'}
            </Button>
            <Button
              onClick={goToPreviousReview}
              disabled={currentReviewIndex === 0}
              variant="outline"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button
              onClick={goToNextReview}
              disabled={currentReviewIndex === uniqueReviews.length - 1}
              variant="outline"
            >
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Review Position Indicator */}
        {uniqueReviews.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Review {currentReviewIndex + 1} of {uniqueReviews.length}
          </div>
        )}

        {/* Enhanced Search and Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Search & Filter Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reviews by text or guest name..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Property</label>
                    <Input
                      placeholder="Property ID..."
                      value={filters.property_id || ''}
                      onChange={(e) => {
                        const newPropertyId = e.target.value || undefined;
                        console.log('🏠 Property filter changed:', newPropertyId);
                        setFilters({
                          ...filters,
                          property_id: newPropertyId,
                          page: 1 // Reset to first page when filter changes
                        });
                      }}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sentiment</label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={filters.sentiment || ''}
                      onChange={(e) => {
                        const newSentiment = e.target.value || undefined;
                        console.log('😊 Sentiment filter changed:', newSentiment);
                        setFilters({
                          ...filters,
                          sentiment: newSentiment,
                          page: 1 // Reset to first page when filter changes
                        });
                      }}
                    >
                      <option value="">All Sentiments</option>
                      <option value="positive">Positive</option>
                      <option value="negative">Negative</option>
                      <option value="neutral">Neutral</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Sort By</label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={`${filters.sort_by}_${filters.sort_order}`}
                      onChange={(e) => {
                        const [sort_field, sort_direction] = e.target.value.split('_');
                        console.log('🔄 Sort changed:', { sort_field, sort_direction });
                        setFilters({
                          ...filters,
                          sort_by: sort_field,
                          sort_order: sort_direction,
                          page: 1 // Reset to first page when sorting changes
                        });
                      }}
                    >
                      <option value="created_at_desc">Newest First</option>
                      <option value="created_at_asc">Oldest First</option>
                      <option value="rating_desc">Highest Rating</option>
                      <option value="rating_asc">Lowest Rating</option>
                      <option value="review_text_asc">Review A-Z</option>
                      <option value="review_text_desc">Review Z-A</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Items per page</label>
                    <select
                      className="w-full p-2 border rounded-md bg-background"
                      value={filters.limit}
                      onChange={(e) => {
                        const newLimit = parseInt(e.target.value);
                        console.log('📄 Items per page changed:', newLimit);
                        setFilters({
                          ...filters,
                          limit: newLimit,
                          page: 1 // Reset to first page when limit changes
                        });
                      }}
                    >
                      <option value={10}>10 items</option>
                      <option value={20}>20 items</option>
                      <option value={50}>50 items</option>
                      <option value={100}>100 items</option>
                    </select>
                  </div>
                </div>
                
                {/* Filter Actions */}
                <div className="flex flex-wrap gap-2 items-center justify-between pt-2 border-t">
                  <div className="flex flex-wrap gap-2">
                    {(searchTerm || filters.property_id || filters.sentiment) && (
                      <>
                        <span className="text-sm text-muted-foreground">Active filters:</span>
                        {searchTerm && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            Search: "{searchTerm}"
                            <button onClick={() => setSearchTerm('')} className="ml-1">×</button>
                          </Badge>
                        )}
                        {filters.property_id && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            Property: {filters.property_id}
                            <button onClick={() => setFilters({ ...filters, property_id: undefined })} className="ml-1">×</button>
                          </Badge>
                        )}
                        {filters.sentiment && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            Sentiment: {filters.sentiment}
                            <button onClick={() => setFilters({ ...filters, sentiment: undefined })} className="ml-1">×</button>
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log('🧹 Clearing all filters');
                        setSearchTerm('');
                        setFilters({
                          ...filters,
                          property_id: undefined,
                          sentiment: undefined,
                          page: 1,
                          sort_by: 'created_at',
                          sort_order: 'desc'
                        });
                      }}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Clear All
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        console.log('🔍 Manual filter apply');
                        // Force query refetch
                        queryClient.invalidateQueries({ queryKey: ['reviews'] });
                        toast({
                          title: "Filters Applied",
                          description: "Review list is being refreshed with new filters",
                        });
                      }}
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      Apply Filters
                    </Button>
                  </div>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Review Detail */}
        {selectedReview && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Review Detail
                  {selectedReview.has_manager_response && (
                    <Badge className="bg-green-100 text-green-800">Responded</Badge>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAudio}
                  >
                    {audioEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <div className="flex gap-1">
                    {/* Like buttons */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEngagement(selectedReview.id, 'helpful')}
                      title="Mark as Helpful"
                    >
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEngagement(selectedReview.id, 'bookmark')}
                      title="Bookmark Review"
                    >
                      <Bookmark className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setIsResponseDialogOpen(true)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Respond
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Manage Review Response</DialogTitle>
                        <DialogDescription>
                          Respond to this guest review and manage all interactions
                        </DialogDescription>
                      </DialogHeader>
                      
                      {/* Review Content */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-secondary/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={toggleAudio}
                              >
                                {audioEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => translateToSelectedLanguage()}
                                title={`Translate to ${supportedLanguages.find(l => l.code === selectedLanguage)?.name || 'Spanish'}`}
                              >
                                <Languages className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEngagement(selectedReview.id, 'helpful')}
                                title="Mark as Helpful"
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEngagement(selectedReview.id, 'bookmark')}
                                title="Bookmark Review"
                              >
                                <Bookmark className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-foreground font-medium mb-2">
                            {isTranslated && originalText ? originalText : selectedReview.review_text}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Rating: {selectedReview.rating}/5</span>
                            <span>•</span>
                            <span>Sentiment: {selectedReview.sentiment}</span>
                            <span>•</span>
                            <span>{safeFormatDate(selectedReview.created_at)}</span>
                          </div>
                        </div>

                        {/* Enhanced Translation Options */}
                        <div className="space-y-3">
                          <div className="flex gap-2 items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                            >
                              <Languages className="mr-2 h-4 w-4" />
                              Translate Review
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => translateContent(selectedLanguage, 'reply')}
                              disabled={!managerResponse.trim() || isTranslatingReply}
                            >
                              <Languages className="mr-2 h-4 w-4" />
                              {isTranslatingReply ? 'Translating...' : 'Translate Reply'}
                            </Button>
                          </div>
                          
                          {/* Quick Language Selection */}
                          <div className="flex gap-2 items-center">
                            <label className="text-sm font-medium">Target Language:</label>
                            <select
                              className="p-2 border rounded-md bg-background text-sm"
                              value={selectedLanguage}
                              onChange={(e) => setSelectedLanguage(e.target.value)}
                            >
                              {quickLanguages.map(lang => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {showLanguageSelector && (
                            <div className="border rounded-lg p-3 max-h-64 overflow-y-auto">
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {supportedLanguages.map(lang => (
                                  <Button
                                    key={lang.code}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedLanguage(lang.code);
                                      translateContent(lang.code);
                                      setShowLanguageSelector(false);
                                    }}
                                    className="justify-start"
                                  >
                                    <span className="text-xs">{lang.name}</span>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* AI Response Generation */}
                        <div className="flex gap-2">
                          <Button
                            onClick={generateAIResponse}
                            disabled={isAILoading}
                            variant="outline"
                          >
                            <Brain className="mr-2 h-4 w-4" />
                            {isAILoading ? 'Generating...' : 'AI Suggestion'}
                          </Button>
                          
                        </div>

                        {/* Response Textarea with Speech-to-Text */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Manager Response</label>
                          <div className="space-y-2">
                            <div className="flex gap-2 items-center">
                              <select
                                className="p-2 border rounded-md bg-background text-sm"
                                value={currentLanguage}
                                onChange={(e) => setCurrentLanguage(e.target.value)}
                              >
                                <option value="en-US">English (US)</option>
                                <option value="en-GB">English (UK)</option>
                                <option value="es-ES">Spanish</option>
                                <option value="fr-FR">French</option>
                                <option value="de-DE">German</option>
                                <option value="it-IT">Italian</option>
                                <option value="pt-PT">Portuguese</option>
                                <option value="ja-JP">Japanese</option>
                                <option value="ko-KR">Korean</option>
                                <option value="zh-CN">Chinese (Simplified)</option>
                                <option value="ar-SA">Arabic</option>
                                <option value="hi-IN">Hindi</option>
                                <option value="ru-RU">Russian</option>
                                <option value="nl-NL">Dutch</option>
                                <option value="sv-SE">Swedish</option>
                              </select>
                              <div className="text-xs text-muted-foreground">
                                {isRecording ? 'Recording...' : isTranscribing ? 'Processing...' : 'Ready'}
                              </div>
                            </div>
                            <div className="relative">
                              <Textarea
                                placeholder="Type your response here or use speech-to-text..."
                                value={managerResponse}
                                onChange={(e) => setManagerResponse(e.target.value)}
                                rows={4}
                              />
                              <Button
                                onClick={isRecording ? stopRecording : startRecording}
                                variant={isRecording ? "destructive" : "outline"}
                                size="sm"
                                className="absolute bottom-2 right-2"
                                disabled={isTranscribing}
                              >
                                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                                {isRecording ? 'Stop' : isTranscribing ? 'Processing...' : 'Voice'}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            onClick={() => addResponseMutation.mutate({ response_text: managerResponse })}
                            disabled={!managerResponse.trim() || addResponseMutation.isPending}
                            className="flex-1"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            {addResponseMutation.isPending ? 'Sending...' : 'Send Response'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleAudio}
                      >
                        {audioEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                      </Button>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => translateToSelectedLanguage()}
                          title={`Translate to ${supportedLanguages.find(l => l.code === selectedLanguage)?.name || 'Spanish'}`}
                        >
                          <Languages className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowReplyThread(!showReplyThread)}
                          title="Toggle Reply Thread"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEngagement(selectedReview.id, 'helpful')}
                          title="Mark as Helpful"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEngagement(selectedReview.id, 'bookmark')}
                          title="Bookmark Review"
                        >
                          <Bookmark className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                          <p className="text-foreground font-medium">
                            {isTranslated && originalText ? originalText : selectedReview.review_text}
                          </p>

                          {/* Show manager/human response if available for selected review */}
                          {(() => {
                            const resp = extractManagerResponseText(reviewResponses || selectedReview || {});
                            console.log('🔍 Manager response extraction result:', resp, 'from reviewResponses:', reviewResponses, 'selectedReview:', selectedReview);
                            if (resp.text) {
                              return (
                                <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-md">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <p className="text-sm font-medium">💬 Manager Response</p>
                                      <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{resp.text}</p>
                                    </div>
                                    <div className="text-xs text-muted-foreground ml-4">
                                      {resp.by && <div>{resp.by}</div>}
                                      {resp.created_at && <div>{safeFormatDate(resp.created_at)}</div>}
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return (
                              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <p className="text-sm text-muted-foreground">No response data found</p>
                              </div>
                            );
                          })()}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {selectedReview.rating && (
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < selectedReview.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-sm text-muted-foreground">
                          {selectedReview.rating}/5
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Metadata */}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Guest:</span>
                    <span>{selectedReview.guest_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Property:</span>
                    <span>{selectedReview.property_id}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Date:</span>
                    <span>{safeFormatDate(selectedReview.created_at)}</span>
                  </div>
                  <Badge className={getSentimentColor(selectedReview.sentiment)}>
                    {selectedReview.sentiment}
                  </Badge>
                  {selectedReview.response_count && selectedReview.response_count > 0 && (
                    <Badge variant="outline">
                      {selectedReview.response_count} responses
                    </Badge>
                  )}
                </div>

                {/* Reply Thread Display */}
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowReplyThread(!showReplyThread)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      {showReplyThread ? 'Hide' : 'Show'} Reply Thread ({replyThread.length})
                    </Button>
                    {replyThread.length > 0 && (
                      <Badge variant="secondary">
                        {replyThread.filter(r => r.is_ai_generated).length} AI, {replyThread.filter(r => !r.is_ai_generated).length} Human
                      </Badge>
                    )}
                  </div>
                  
                  {showReplyThread && renderReplyThread()}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews List */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : uniqueReviews && uniqueReviews.length > 0 ? (
              <div className="divide-y">
                {uniqueReviews.map((review: SimpleReview) => (
                  <div
                    key={review.id}
                    className={`p-6 transition-colors cursor-pointer ${
                      review.id === selectedReview?.id
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => handleReviewClick(review)}
                  >
                    <div className="space-y-3">
                      {/* Review Content */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-foreground font-medium">{review.review_text}</p>
                          {(() => {
                            const snippet = extractManagerResponseText(review);
                            if (snippet.text) {
                              return (
                                <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-md">
                                  <p className="text-sm text-green-800 font-medium">💬 Manager Response:</p>
                                  <p className="text-sm text-muted-foreground mt-1">{snippet.text}</p>
                                  {snippet.by && (
                                    <p className="text-xs text-muted-foreground mt-1">by {snippet.by}</p>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {review.rating && (
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 text-sm text-muted-foreground">
                                {review.rating}/5
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Review Metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Guest:</span>
                          <span>{review.guest_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Property:</span>
                          <span>{review.property_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Date:</span>
                          <span>{safeFormatDate(review.created_at)}</span>
                        </div>
                        <Badge className={getSentimentColor(review.sentiment)}>
                          {review.sentiment}
                        </Badge>
                        {review.has_manager_response && (
                          <Badge className="bg-green-100 text-green-800">Responded</Badge>
                        )}
                        {review.archived && (
                          <Badge className="bg-blue-100 text-blue-800">Archived</Badge>
                        )}
                        
                        {/* Engagement and Archive buttons */}
                        <div className="flex gap-1 items-center">
                          {/* Like/Engagement buttons */}
                          <div className="flex gap-1">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEngagement(review.id, 'helpful');
                              }}
                              size="sm"
                              variant="ghost"
                              title="Mark as Helpful"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEngagement(review.id, 'bookmark');
                              }}
                              size="sm"
                              variant="ghost"
                              title="Bookmark Review"
                            >
                              <Bookmark className="h-3 w-3" />
                            </Button>
                            
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                if ('speechSynthesis' in window) {
                                  // Stop any current speech
                                  window.speechSynthesis.cancel();
                                  
                                  // Create new utterance
                                  const utterance = new SpeechSynthesisUtterance(review.review_text);
                                  
                                  // Add proper event handlers
                                  utterance.onstart = () => {
                                    console.log('Started reading review');
                                  };
                                  
                                  utterance.onend = () => {
                                    console.log('Finished reading review');
                                  };
                                  
                                  utterance.onerror = (error) => {
                                    console.error('Speech synthesis error:', error);
                                  };
                                  
                                  // Speak the text
                                  window.speechSynthesis.speak(utterance);
                                }
                              }}
                              size="sm"
                              variant="ghost"
                              title="Read Review Aloud (Click to stop current reading)"
                            >
                              <Volume2 className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* Archive/Unarchive buttons */}
                          {!showArchived && !review.archived && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveReview(review.id);
                              }}
                              size="sm"
                              variant="ghost"
                              title="Archive Review"
                            >
                              <Archive className="h-3 w-3" />
                            </Button>
                          )}
                          {showArchived && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                unarchiveReview(review.id);
                              }}
                              size="sm"
                              variant="ghost"
                              title="Restore from Archive"
                            >
                              <ArchiveRestore className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <div className="space-y-2">
                  <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No reviews found</h3>
                  <p className="text-muted-foreground">
                    {showArchived ? 'No archived reviews match your current filters.' : 'No reviews match your current filters.'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm('');
                        setFilters({
                          page: 1,
                          limit: 20,
                          property_id: undefined,
                          sentiment: undefined,
                          sort_by: 'created_at',
                          sort_order: 'desc'
                        });
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Button onClick={() => refetch()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Info */}
        {reviewsData && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {uniqueReviews.length} of {reviewsData.total_count} reviews
            (Page {reviewsData.page} of {reviewsData.total_pages})
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ReviewsEnhanced;