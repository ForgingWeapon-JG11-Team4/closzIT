import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BedrockService {
    private client: BedrockRuntimeClient;
    private readonly logger = new Logger(BedrockService.name);
    // Claude Sonnet 4.5 Model ID (Japan Cross-Region Inference)
    private readonly modelId = 'jp.anthropic.claude-sonnet-4-5-20250929-v1:0';

    constructor(private configService: ConfigService) {
        this.client = new BedrockRuntimeClient({
            region: this.configService.get<string>('AWS_REGION', 'ap-northeast-1'),
            credentials: {
                accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
                secretAccessKey: this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
            },
        });
    }

    async extractClothingSpec(text: string, imageBase64?: string): Promise<any> {
        try {
            const prompt = `
You are an expert fashion analyst specializing in clothing color and category identification.

TASK: Analyze the provided clothing image and extract attributes.

IMPORTANT COLOR ANALYSIS RULES:
- Look at the DOMINANT color of the clothing item
- If the color appears olive, military green, or muted green-brown, choose "Khaki"
- If the color is a dark blue that's not pure navy, still choose "Navy"
- Grey-ish beige should be "Beige", not "Gray"
- For striped patterns, list the main colors present
- Be precise - "Khaki" is the brownish-green military color, not just any green

RULES:
1. Category & Sub-Category: Choose exactly one value each.
2. Colors: Choose 1-3 DOMINANT colors. Be precise about the shade.
3. Pattern, Detail, Style Mood: Return lists.
4. Use ONLY values from the ALLOWED LIST. If no exact match, use 'Other'.

ALLOWED VALUES:
- Category: Outer, Top, Bottom, Shoes, Other
- Sub-Category (by Category):
  * Outer: Cardigan, Jacket, Blazer, Jumper, Padding, Coat, Vest, Hoodie-zipup, Windbreaker, Other
  * Top: Short-sleeve-T, Long-sleeve-T, Hoodie, Sweatshirt, Knit, Shirt, Sleeveless, Polo-shirt, Other
  * Bottom: Denim, Slacks, Cotton-pants, Sweatpants, Shorts, Skirt, Leggings, Other
  * Shoes: Sneakers, Loafers, Dress-shoes, Boots, Sandals, Slippers, Other
- Colors: Black, White, Gray, Beige, Brown, Navy, Blue, Sky-blue, Red, Pink, Orange, Yellow, Green, Mint, Purple, Khaki, Silver, Gold, Other
- Pattern: Solid, Stripe, Check, Dot, Floral, Animal, Graphic, Camouflage, Argyle, Other
- Detail: Logo, Pocket, Button, Zipper, Hood, Embroidery, Quilted, Distressed, Knit-rib, Other
- Style Mood: Casual, Street, Minimal, Formal, Sporty, Vintage, Gorpcore, Other
- TPO: Date, Daily, Commute, Sports, Travel, Wedding, Party, Home, School, Other
- Season: Spring, Summer, Autumn, Winter

Return ONLY a valid JSON object. No markdown code blocks, no explanations.

{
  "category": "string",
  "sub_category": "string",
  "colors": ["string"],
  "pattern": ["string"],
  "detail": ["string"],
  "style_mood": ["string"],
  "tpo": ["string"],
  "season": ["string"]
}
`;

            const content: any[] = [{ type: 'text', text: prompt }];

            if (imageBase64) {
                content.push({
                    type: 'image',
                    source: {
                        type: 'base64',
                        media_type: 'image/png',
                        data: imageBase64,
                    }
                });
            }

            if (text) {
                content.push({ type: 'text', text: `Analyze this description/image: ${text}` });
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
