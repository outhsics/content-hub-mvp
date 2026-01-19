import ai, { MODELS, rateLimiter } from './openai.client';

export interface TitleOption {
  title: string;
  predicted_ctr: number;
}

export class TitleOptimizer {
  /**
   * Generate multiple optimized titles for an article
   */
  async generateTitles(
    originalTitle: string,
    content: string,
    platform: string,
    count: number = 10
  ): Promise<TitleOption[]> {
    // Truncate content
    const truncatedContent = content.substring(0, 500);

    const platformGuidance = this.getPlatformGuidance(platform);

    const prompt = `你是标题优化专家。基于原文，生成 ${count} 个高点击率标题。

原标题：${originalTitle}
核心内容：${truncatedContent}
目标平台：${platform}

${platformGuidance}

要求：
1. 30字以内
2. 包含数字或疑问句（吸引点击）
3. 制造好奇心或紧迫感
4. 正能量或痛点切入
5. 符合平台调性和用户习惯

返回 JSON 数组，不要其他内容：
[
  {"title": "标题1", "predicted_ctr": 0.15},
  {"title": "标题2", "predicted_ctr": 0.12}
]`;

    try {
      await rateLimiter.wait();

      console.log(`  📝 Generating ${count} titles for ${platform}...`);

      const response = await ai.chat.completions.create({
        model: MODELS.FAST,
        messages: [
          {
            role: 'system',
            content: '你是爆款标题创作专家，深谙各平台用户心理和点击偏好。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7, // Higher temperature for creativity
        response_format: { type: "json_object" },
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      const titles = result.titles as TitleOption[];

      // Sort by predicted CTR
      titles.sort((a, b) => b.predicted_ctr - a.predicted_ctr);

      console.log(`  ✅ Generated ${titles.length} titles`);
      console.log(`  🏆 Best title: "${titles[0].title}" (CTR: ${(titles[0].predicted_ctr * 100).toFixed(1)}%)`);

      return titles;
    } catch (error) {
      console.error('❌ Title generation error:', error);
      throw error;
    }
  }

  /**
   * Get platform-specific guidance
   */
  private getPlatformGuidance(platform: string): string {
    const guidance = {
      toutiao: `
平台特点：今日头条用户喜欢热点、实用性、正能量
标题策略：
- 使用数字："5个技巧"、"3种方法"
- 提问式："为什么..."、"如何..."
- 强调价值："终于..."、"不看后悔"
- 适当使用感叹号`,
      zhihu: `
平台特点：知乎用户注重深度、观点、专业性
标题策略：
- 体现深度："为什么..."的本质
- 表达观点："我认为..."的思考
- 引发好奇："究竟是什么..."
- 避免标题党`,
      xiaohongshu: `
平台特点：小红书用户喜欢真实体验、种草、生活方式
标题策略：
- 使用emoji 🎯🔥💡
- 强调真实："真实测评"、"亲测有效"
- 制造紧迫："必看"、"绝了"
- 短小精悍：15-25字`,
      baijiahao: `
平台特点：百家号用户关注热点资讯、实用信息
标题策略：
- 结合热点："最新..."
- 强调时效："刚刚..."
- 突出价值："必看..."
- 客观准确`
    };

    return guidance[platform as keyof typeof guidance] || guidance.toutiao;
  }

  /**
   * Select the best title from options
   */
  selectBestTitle(titles: TitleOption[]): TitleOption {
    // Return the title with highest predicted CTR
    return titles.reduce((best, current) =>
      current.predicted_ctr > best.predicted_ctr ? current : best
    );
  }
}
