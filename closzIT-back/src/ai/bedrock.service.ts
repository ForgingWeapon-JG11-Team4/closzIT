import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BedrockService {
    private client: BedrockRuntimeClient;
    private readonly logger = new Logger(BedrockService.name);
    // Claude 3.5 Sonnet Model ID (Tokyo/US) - using latest available Sonnet as requested for "4.5" placeholder
    // Since 4.5 is not yet available, we use 3.5 Sonnet.
    // Using resource ID for ap-northeast-1 if available, otherwise default.
    // Common ID: anthropic.claude-3-5-sonnet-20240620-v1:0
    private readonly modelId = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

    constructor(private configService: ConfigService) {
        this.client = new BedrockRuntimeClient({
            region: this.configService.get<string>('AWS_REGION', 'ap-northeast-1'),
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY'),
            },
        });
    }

    async extractClothingSpec(text: string, imageBase64?: string): Promise<any> {
        try {
            const prompt = `
      You are an expert fashion analyzer. Based on the CLOTHING_SPEC.md rules, analyze the input and return a JSON object.
      
      RULES:
      1. Category & Sub-Category: Choose exactly one string value.
      2. Colors, Pattern, Detail, Style Mood: Return a list of strings.
      3. Use only values from the ALLOWED LIST below. If no match, use 'Other'.
      
      ALLOWED LIST:
      - Category: Outer, Top, Bottom, Shoes, Other
      - Sub-Category:
        (Outer): Cardigan, Jacket, Blazer, Jumper, Padding, Coat, Vest, Hoodie-zipup, Windbreaker, Other
        (Top): Short-sleeve-T, Long-sleeve-T, Hoodie, Sweatshirt, Knit, Shirt, Sleeveless, Polo-shirt, Other
        (Bottom): Denim, Slacks, Cotton-pants, Sweatpants, Shorts, Skirt, Leggings, Other
        (Shoes): Sneakers, Loafers, Dress-shoes, Boots, Sandals, Slippers, Other
      - Colors: Black, White, Gray, Beige, Brown, Navy, Blue, Sky-blue, Red, Pink, Orange, Yellow, Green, Mint, Purple, Khaki, Silver, Gold, Other
      - Pattern: Solid, Stripe, Check, Dot, Floral, Animal, Graphic, Camouflage, Argyle, Other
      - Detail: Logo, Pocket, Button, Zipper, Hood, Embroidery, Quilted, Distressed, Knit-rib, Other
      - Style Mood: Casual, Street, Minimal, Formal, Sporty, Vintage, Gorpcore, Other

      Return ONLY the JSON object. No markdown, no explanations.
      Format:
      {
        "category": "...",
        "sub_category": "...",
        "colors": [...],
        "pattern": [...],
        "detail": [...],
        "style_mood": [...]
      }
      `;

            const content: any[] = [{ text: prompt }];

            if (imageBase64) {
                content.push({
                    image: {
                        format: 'png', // assuming png based on previous tasks
                        source: { bytes: Buffer.from(imageBase64, 'base64') }
                    }
                });
            }

            if (text) {
                content.push({ text: `Analyze this description/image: ${text}` });
            }

            const payload = {
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 1000,
                messages: [
                    {
                        role: 'user',
                        content: content,
                    },
                ],
            };

            const command = new InvokeModelCommand({
                modelId: this.modelId,
                contentType: 'application/json',
                body: JSON.stringify(payload),
            });

            const response = await this.client.send(command);
            const responseBody = JSON.parse(new TextDecoder().decode(response.body));

            const resultText = responseBody.content[0].text;
            // Simple JSON extraction if wrapped in markdown
            const jsonMatch = resultText.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : resultText;

            return JSON.parse(jsonStr);

        } catch (error) {
            this.logger.error('Bedrock invocation failed', error);
            throw error;
        }
    }
}
