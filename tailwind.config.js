/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // V1 手册
        primary: '#FF3B4D', // 主红
        accent: '#FF7A45',  // 辅橙
        ai: '#3B82F6',      // 电蓝
        purple: '#8B5CF6',  // 紫
        bg: '#0F1115',      // 深黑
        card: '#1C1F26',    // 卡片灰
        muted: '#8A94A6',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
        heavy: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        num: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 10px 40px -10px rgba(255,59,77,0.55)',
        glowOrange: '0 10px 40px -10px rgba(255,122,69,0.55)',
        glowAi: '0 10px 40px -10px rgba(59,130,246,0.45)',
        card: '0 8px 24px rgba(0,0,0,0.35)',
      },
      backgroundImage: {
        'cta-gradient': 'linear-gradient(90deg, #FF3B4D 0%, #FF5A3C 55%, #FF7A45 100%)',
        'share-gradient': 'linear-gradient(90deg, #8B5CF6 0%, #6366F1 50%, #3B82F6 100%)',
        'ai-gradient': 'linear-gradient(90deg, #3B82F6 0%, #8B5CF6 100%)',
      },
      keyframes: {
        // 通用
        pop: {
          '0%': { transform: 'translateY(20px) scale(0.94)', opacity: '0' },
          '60%': { transform: 'translateY(-4px) scale(1.02)', opacity: '1' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // 按钮被点：缩→弹
        pressBounce: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(0.94)' },
          '70%': { transform: 'scale(1.04)' },
          '100%': { transform: 'scale(1)' },
        },
        // 闪电划过
        boltSweep: {
          '0%': { transform: 'translateX(-120%) skewX(-20deg)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateX(220%) skewX(-20deg)', opacity: '0' },
        },
        // 生成中：气泡对撞
        clashLeft: {
          '0%,100%': { transform: 'translate(-14px,0) rotate(-6deg)' },
          '50%': { transform: 'translate(8px,-4px) rotate(4deg)' },
        },
        clashRight: {
          '0%,100%': { transform: 'translate(14px,0) rotate(6deg)' },
          '50%': { transform: 'translate(-8px,4px) rotate(-4deg)' },
        },
        sparkBurst: {
          '0%': { transform: 'scale(0.4)', opacity: '0' },
          '40%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        // 结果卡片：从下往上 + 抖
        cardBoom: {
          '0%': { transform: 'translateY(28px) scale(0.96)', opacity: '0' },
          '55%': { transform: 'translateY(-4px) scale(1.02)', opacity: '1' },
          '72%': { transform: 'translateY(0) translateX(-3px)' },
          '86%': { transform: 'translateY(0) translateX(3px)' },
          '100%': { transform: 'translateY(0) scale(1)' },
        },
        // 打字气泡
        typeIn: {
          '0%': { transform: 'translateY(10px) scale(0.9)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        // 完成「叮」一下
        dingPop: {
          '0%': { transform: 'scale(0.4) rotate(-12deg)', opacity: '0' },
          '60%': { transform: 'scale(1.15) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(-6deg)', opacity: '1' },
        },
        // CTA 脉冲光
        pulseGlow: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,59,77,0.55)' },
          '50%': { boxShadow: '0 0 0 14px rgba(255,59,77,0)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        // 标题轻微呼吸
        titleSkew: {
          '0%,100%': { transform: 'skewX(-3deg)' },
          '50%': { transform: 'skewX(-5deg)' },
        },
        // 烟花小碎
        fwParticle: {
          '0%': { transform: 'translate(0,0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(var(--dx), var(--dy)) scale(0.3)', opacity: '0' },
        },
        checkPop: {
          '0%': { transform: 'scale(0.2)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        pop: 'pop 320ms cubic-bezier(0.22,1,0.36,1) both',
        pressBounce: 'pressBounce 360ms cubic-bezier(0.22,1,0.36,1)',
        boltSweep: 'boltSweep 520ms ease-out',
        clashLeft: 'clashLeft 900ms ease-in-out infinite',
        clashRight: 'clashRight 900ms ease-in-out infinite',
        sparkBurst: 'sparkBurst 700ms ease-out infinite',
        cardBoom: 'cardBoom 520ms cubic-bezier(0.22,1,0.36,1) both',
        typeIn: 'typeIn 280ms cubic-bezier(0.22,1,0.36,1) both',
        dingPop: 'dingPop 520ms cubic-bezier(0.22,1,0.36,1) both',
        pulseGlow: 'pulseGlow 2s ease-out infinite',
        float: 'float 3.5s ease-in-out infinite',
        fwParticle: 'fwParticle 700ms ease-out forwards',
        checkPop: 'checkPop 420ms cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}
