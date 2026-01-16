import { Component, ChangeDetectionStrategy, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleGenAI, Type } from '@google/genai';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface TrainingEnvironment {
  icon: string;
  title: string;
  description: string;
  instructions: string[];
}

type CoachingTone = 'encouraging' | 'direct';
type ResponseSpeed = 'normal' | 'fast';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface AnalysisResult {
  pace: number; // words per minute
  pitchVariation: 'monotone' | 'dynamic';
  fillerWords: { word: string; count: number; }[];
  summary: string;
}

interface PaceFeedback {
  label: string;
  color: string;
  percentage: number;
}


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class AppComponent implements OnInit, OnDestroy {
  features = signal<Feature[]>([
    {
      icon: 'cube-transparent',
      title: 'تفاعل واقعي',
      description: 'تجربة واقع معزز غامرة تزيد من التركيز وتقلل من رهبة المسرح في بيئة محاكاة.'
    },
    {
      icon: 'chart-bar',
      title: 'تحليل ذكي للأداء',
      description: 'يقيس الذكاء الاصطائناعي نبرة الصوت ولغة الجسد وسرعة الإلقاء، ويقدم ملاحظات فورية وقابلة للتنفيذ.'
    },
    {
      icon: 'video-camera',
      title: 'محاكاة واقعية',
      description: 'بيئتنا للواقع المعزز تحاكي الاستوديوهات والجماهير والكاميرات بشكل واقعي لممارسة حقيقية.'
    },
    {
      icon: 'robot',
      title: 'مدرب افتراضي مدعوم بالذكاء الاصطناعي',
      description: 'احصل على نصائح فورية وتوجيهات صوتية ودعم مستمر من مدربنا الافتراضي الذكي.'
    },
     {
      icon: 'bolt',
      title: 'استجابات سريعة بالذكاء الاصطناعي',
      description: 'احصل على ملاحظات فورية وسريعة أثناء التدريب دون أي تأخير، مما يساعد على الحفاظ على تدفقك.'
    }
  ]);

  environments = signal<TrainingEnvironment[]>([
    {
        icon: 'newspaper',
        title: 'استوديو الأخبار',
        description: 'محاكاة واقعية لاستوديو إخباري مع معدات متطورة لإتقان مهاراتك في تقديم الأخبار.',
        instructions: ['انتبه للضوء الأحمر على الكاميرا النشطة.', 'اقرأ بوضوح من شاشة القراءة.', 'حافظ على وقفة مهنية.']
    },
    {
        icon: 'chat-bubble-left-right',
        title: 'برنامج حواري',
        description: 'طور مهاراتك في النقاش والعرض في بيئة برنامج حواري ديناميكي مع مضيف افتراضي.',
        instructions: ['تفاعل مع المضيف الافتراضي.', 'استمع جيدًا للأسئلة قبل الإجابة.', 'استخدم إيماءات معبرة.']
    },
    {
        icon: 'microphone',
        title: 'مؤتمر صحفي',
        description: 'عزز قدرتك على الاستجابة بسرعة وثقة للأسئلة الصعبة من المراسلين الافتراضيين.',
        instructions: ['خاطب المراسلين مباشرة.', 'حافظ على هدوئك تحت الضغط.', 'اجعل إجاباتك موجزة ومباشرة.']
    },
    {
        icon: 'globe-alt',
        title: 'التقارير الميدانية',
        description: 'جرب التقارير الميدانية في مواقع ديناميكية متنوعة، من شوارع المدينة إلى الطبيعة.',
        instructions: ['صف محيطك بوضوح.', 'امسك الميكروفون الافتراضي بثبات.', 'ارفع صوتك ليتغلب على ضوضاء الخلفية.']
    },
    {
        icon: 'user-group',
        title: 'ورش عمل تفاعلية',
        description: 'شارك في التعلم التعاوني، وتلقي الملاحظات من الأقران، وتبادل الأفكار في بيئة ورشة عمل افتراضية.',
        instructions: ['تفاعل مع الصور الرمزية الافتراضية للأقران.', 'استخدم السبورة البيضاء الافتراضية لتوضيح النقاط.', 'شارك في الأنشطة الجماعية.']
    },
    {
        icon: 'cog',
        title: 'بيئات مخصصة',
        description: 'سيناريوهات مصممة خصيصًا لتلبية احتياجات تدريبية محددة، من العروض التقديمية للشركات إلى المحاضرات الأكاديمية.',
        instructions: ['اتبع توجيهات السيناريو المخصص.', 'كيف أداءك مع السياق المحدد.']
    }
  ]);

  // --- Chat Feature ---
  userInput = signal('');
  private readonly initialMessage: ChatMessage = { role: 'model', text: 'أهلاً بك! أنا مدربك الافتراضي. كيف يمكنني مساعدتك في الاستعداد لخطابك اليوم؟' };
  chatMessages = signal<ChatMessage[]>([this.initialMessage]);
  isLoading = signal(false);
  coachingTone = signal<CoachingTone>('encouraging');
  responseSpeed = signal<ResponseSpeed>('normal');

  private readonly ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

  private readonly systemInstructions: Record<CoachingTone, string> = {
    encouraging: "You are a friendly and encouraging public speaking coach. Your name is SpeakXR Coach. Respond in Arabic. Keep your answers concise, positive, and helpful. Use motivational language.",
    direct: "You are a professional, direct, and expert public speaking coach. Your name is SpeakXR Coach. Respond in Arabic. Provide clear, concise, and actionable feedback. Be straightforward and to the point."
  };

  // --- AR HUD Feature ---
  audienceEngagement = signal(75);
  aiFeedback = signal('ابدأ بقوة!');
  activeEnvironment = signal<TrainingEnvironment | null>(null);
  showEnvironmentInstructions = signal(false);
  private instructionsTimeout: any;
  private readonly feedbackMessages: string[] = [
    'حافظ على وتيرة جيدة!',
    'تواصل بصري ممتاز!',
    'ارفع صوتك قليلاً',
    'وقفة ممتازة للتأكيد',
    'طاقة رائعة!',
    'استخدم إيماءات اليدين أكثر',
    'تجنب الكلمات الحشوية'
  ];
  private engagementInterval: any;
  private feedbackInterval: any;

  // --- Recording & Analysis Feature ---
  isRecording = signal(false);
  isAnalyzing = signal(false);
  analysisResult = signal<AnalysisResult | null>(null);
  recordingTime = signal(0);
  analysisError = signal<string | null>(null);
  analysisProgress = signal(0);
  private analysisInterval: any;

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private recordingInterval: any;
  private stream: MediaStream | null = null;
  
  // --- AR Camera Feature ---
  isCameraEnabled = signal(false);
  cameraError = signal<string | null>(null);
  private cameraStream: MediaStream | null = null;

  private readonly analysisSchema = {
    type: Type.OBJECT,
    properties: {
        pace: {
            type: Type.INTEGER,
            description: 'The speaker\'s pace in words per minute.',
        },
        pitchVariation: {
            type: Type.STRING,
            description: 'Classification of pitch variation. Either "monotone" or "dynamic".',
        },
        fillerWords: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    count: { type: Type.INTEGER },
                },
                required: ['word', 'count']
            },
            description: 'A list of detected filler words and their counts.',
        },
        summary: {
            type: Type.STRING,
            description: 'A brief, constructive summary of the performance in Arabic, max 2 sentences.'
        }
    },
    required: ['pace', 'pitchVariation', 'fillerWords', 'summary']
  };


  ngOnInit(): void {
    if (this.environments().length > 0) {
      this.setActiveEnvironment(this.environments()[0]);
    }

    // Simulate dynamic audience engagement
    this.engagementInterval = setInterval(() => {
      this.audienceEngagement.update(value => {
        const change = Math.floor(Math.random() * 11) - 5; // -5 to +5
        const newValue = value + change;
        return Math.max(0, Math.min(100, newValue)); // Clamp between 0 and 100
      });
    }, 2000);

    // Simulate dynamic AI feedback
    this.feedbackInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.feedbackMessages.length);
      this.aiFeedback.set(this.feedbackMessages[randomIndex]);
    }, 7000);
  }

  ngOnDestroy(): void {
    clearInterval(this.engagementInterval);
    clearInterval(this.feedbackInterval);
    clearTimeout(this.instructionsTimeout);
    this.stopRecording();
    this.stopTimer();
    this.stopCamera();
    clearInterval(this.analysisInterval);
  }


  async sendMessage(): Promise<void> {
    const message = this.userInput().trim();
    if (!message || this.isLoading()) {
      return;
    }

    // Add user message to chat
    this.chatMessages.update(messages => [...messages, { role: 'user', text: message }]);
    this.isLoading.set(true);
    this.userInput.set('');

    try {
      const config: { systemInstruction: string, thinkingConfig?: { thinkingBudget: number } } = {
        systemInstruction: this.systemInstructions[this.coachingTone()]
      };

      if (this.responseSpeed() === 'fast') {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `User question: ${message}`,
        config: config
      });

      this.chatMessages.update(messages => [...messages, { role: 'model', text: response.text }]);

    } catch (error) {
      console.error('Error sending message to AI:', error);
      this.chatMessages.update(messages => [...messages, { role: 'model', text: 'عذراً، حدث خطأ ما. الرجاء المحاولة مرة أخرى.' }]);
    } finally {
      this.isLoading.set(false);
    }
  }

  clearChat(): void {
    this.chatMessages.set([this.initialMessage]);
  }

  setCoachingTone(tone: CoachingTone): void {
    this.coachingTone.set(tone);
  }

  setResponseSpeed(speed: ResponseSpeed): void {
    this.responseSpeed.set(speed);
  }

  setActiveEnvironment(environment: TrainingEnvironment): void {
    clearTimeout(this.instructionsTimeout);
    this.activeEnvironment.set(environment);
    if (environment.instructions?.length) {
      this.showEnvironmentInstructions.set(true);
      this.instructionsTimeout = setTimeout(() => this.showEnvironmentInstructions.set(false), 7000);
    }
  }

  previewEnvironment(environment: TrainingEnvironment): void {
    this.setActiveEnvironment(environment);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  dismissInstructions(): void {
    this.showEnvironmentInstructions.set(false);
    clearTimeout(this.instructionsTimeout);
  }

  scrollTo(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- Recording & Analysis Methods ---

  async toggleRecording(): Promise<void> {
    this.analysisError.set(null);
    if (this.isRecording()) {
      this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
  
  private async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.isRecording.set(true);
      this.analysisResult.set(null);
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(this.stream);
  
      this.mediaRecorder.addEventListener('dataavailable', event => {
        this.audioChunks.push(event.data);
      });
  
      this.mediaRecorder.addEventListener('stop', () => {
        this.analyzeRecording();
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;
      });
  
      this.mediaRecorder.start();
      this.startTimer();
    } catch (err: any) {
      console.error('Error starting recording:', err);
      let errorMessage = 'لم نتمكن من الوصول إلى الميكروفون. يرجى المحاولة مرة أخرى.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'تم رفض إذن الوصول إلى الميكروفون. يرجى تمكين الوصول في إعدادات المتصفح الخاص بك والمحاولة مرة أخرى.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'لم يتم العثور على ميكروفون. يرجى التأكد من توصيل جهاز ميكروفون.';
      }
      
      this.analysisError.set(errorMessage);
      this.isRecording.set(false);
    }
  }

  private stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
    this.isRecording.set(false);
    this.stopTimer();
  }
  
  private async analyzeRecording(): Promise<void> {
    if (this.audioChunks.length === 0) return;

    this.isAnalyzing.set(true);
    this.analysisProgress.set(0);
    
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
    this.audioChunks = []; // Clear chunks after creating blob

    // Simulate progress
    this.analysisInterval = setInterval(() => {
        this.analysisProgress.update(p => {
            const increment = p < 80 ? 5 : 2;
            const newProgress = p + increment;
            if (newProgress >= 95) {
                clearInterval(this.analysisInterval);
                return 95;
            }
            return newProgress;
        });
    }, 250);

    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    
    reader.onloadend = async () => {
      try {
        const base64Audio = (reader.result as string).split(',')[1];
  
        const audioPart = {
          inlineData: {
            mimeType: 'audio/webm',
            data: base64Audio,
          },
        };

        const textPart = {
          text: `Analyze this speech recording. Provide feedback on pace (words per minute), pitch variation (classify as 'monotone' or 'dynamic'), and count the occurrences of common Arabic filler words like "آآآ", "إممم", "يعني". Return the result as a JSON object matching the provided schema. Also, provide a short, constructive summary in Arabic.`
        };

        const response = await this.ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [audioPart, textPart] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: this.analysisSchema
            }
        });
        
        clearInterval(this.analysisInterval);
        this.analysisProgress.set(100);
        const result = JSON.parse(response.text);

        setTimeout(() => {
            this.analysisResult.set(result);
            this.isAnalyzing.set(false);
        }, 500); // Show 100% for a moment

      } catch (error) {
        clearInterval(this.analysisInterval);
        this.analysisProgress.set(0);
        console.error('Error analyzing audio:', error);
        this.analysisError.set('عذراً، لم نتمكن من تحليل التسجيل. قد يكون قصيراً جداً. حاول مرة أخرى.');
        this.analysisResult.set(null);
        this.isAnalyzing.set(false);
      }
    };

    reader.onerror = () => {
        clearInterval(this.analysisInterval);
        this.analysisProgress.set(0);
        this.analysisError.set('حدث خطأ أثناء قراءة الملف الصوتي.');
        this.isAnalyzing.set(false);
    };
  }

  recordAgain(): void {
    this.analysisResult.set(null);
    this.analysisError.set(null);
  }

  private startTimer(): void {
    this.recordingTime.set(0);
    this.recordingInterval = setInterval(() => {
      this.recordingTime.update(val => val + 1);
    }, 1000);
  }

  private stopTimer(): void {
    clearInterval(this.recordingInterval);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
  }

  getPaceFeedback(wpm: number): PaceFeedback {
    const minIdeal = 140, maxIdeal = 160;
    const maxRange = 220;
    let percentage = (wpm / maxRange) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    if (wpm < 120) {
      return { label: 'بطيء جدًا', color: 'bg-red-500', percentage };
    } else if (wpm < minIdeal) {
      return { label: 'بطيء', color: 'bg-yellow-500', percentage };
    } else if (wpm <= maxIdeal) {
      return { label: 'مثالي', color: 'bg-green-500', percentage };
    } else if (wpm < 180) {
      return { label: 'سريع', color: 'bg-yellow-500', percentage };
    } else {
      return { label: 'سريع جدًا', color: 'bg-red-500', percentage };
    }
  }

  // --- AR Camera Methods ---

  async toggleCamera(): Promise<void> {
    this.cameraError.set(null);
    if (this.isCameraEnabled()) {
        this.stopCamera();
        this.isCameraEnabled.set(false);
    } else {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.isCameraEnabled.set(true);
            // Use a timeout to ensure the video element is in the DOM after the signal update.
            setTimeout(() => {
                const videoElement = document.getElementById('cameraFeed') as HTMLVideoElement;
                if (videoElement) {
                    videoElement.srcObject = this.cameraStream;
                }
            }, 0);
        } catch (err: any) {
            console.error('Error starting camera:', err);
            let errorMessage = 'لم نتمكن من الوصول إلى الكاميرا. يرجى المحاولة مرة أخرى.';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'تم رفض إذن الوصول إلى الكاميرا. يرجى تمكين الوصول في إعدادات المتصفح.';
            } else if (err.name === 'NotFoundError') {
                errorMessage = 'لم يتم العثور على كاميرا.';
            }
            this.cameraError.set(errorMessage);
            this.isCameraEnabled.set(false);
        }
    }
  }

  private stopCamera(): void {
      if (this.cameraStream) {
          this.cameraStream.getTracks().forEach(track => track.stop());
          this.cameraStream = null;
      }
  }
}
