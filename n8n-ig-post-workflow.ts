import { workflow, node, trigger, ifElse, switchCase, sticky, expr, newCredential } from '@n8n/workflow-sdk';

// === TRIGGER ===
const webhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Webhook',
    parameters: { httpMethod: 'POST', path: 'publish-post', responseMode: 'responseNode', options: {} },
    position: [-600, 400]
  },
  output: [{ json: { node: '17841480468406561', post_type: 'http_image', image_url: 'https://example.com/img.jpg', video_url: '', caption: 'Test', cover_image: '', property_id: '', schedule_id: '' } }]
});

// === NORMALIZE + AUTO-DETECT ===
const normalize = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Normalize Input',
    parameters: {
      assignments: {
        assignments: [
          { id: 'n1', name: 'node', value: expr("{{ $json.node ?? '17841480468406561' }}"), type: 'string' },
          { id: 'n2', name: 'image_url', value: expr('{{ $json.image_url ?? "" }}'), type: 'string' },
          { id: 'n3', name: 'video_url', value: expr('{{ $json.video_url ?? "" }}'), type: 'string' },
          { id: 'n4', name: 'caption', value: expr('{{ $json.caption ?? "" }}'), type: 'string' },
          { id: 'n5', name: 'cover_image', value: expr('{{ $json.cover_image ?? "" }}'), type: 'string' },
          { id: 'n6', name: 'property_id', value: expr('{{ $json.property_id ?? "" }}'), type: 'string' },
          { id: 'n7', name: 'schedule_id', value: expr('{{ $json.schedule_id ?? "" }}'), type: 'string' },
          { id: 'n8', name: 'post_type', value: expr("{{ $json.post_type ?? ($json.video_url ? 'http_reel' : 'http_image') }}"), type: 'string' }
        ]
      },
      options: {}
    },
    position: [-300, 400]
  },
  output: [{ json: { node: '17841480468406561', post_type: 'http_image', image_url: 'https://example.com/img.jpg', video_url: '', caption: 'Test' } }]
});

// === ROUTER ===
const router = switchCase({
  version: 3.2,
  config: {
    name: 'Content Router',
    parameters: {
      rules: {
        values: [
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'http_image', operator: { type: 'string', operation: 'equals' }, id: 'r1' }], combinator: 'and' }, renameOutput: true, outputKey: 'HTTP Image' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'fb_image', operator: { type: 'string', operation: 'equals' }, id: 'r2' }], combinator: 'and' }, renameOutput: true, outputKey: 'FB Image' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'http_story_image', operator: { type: 'string', operation: 'equals' }, id: 'r3' }], combinator: 'and' }, renameOutput: true, outputKey: 'HTTP Story Image' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'http_story_video', operator: { type: 'string', operation: 'equals' }, id: 'r4' }], combinator: 'and' }, renameOutput: true, outputKey: 'HTTP Story Video' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'fb_story_image', operator: { type: 'string', operation: 'equals' }, id: 'r5' }], combinator: 'and' }, renameOutput: true, outputKey: 'FB Story Image' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'http_reel', operator: { type: 'string', operation: 'equals' }, id: 'r6' }], combinator: 'and' }, renameOutput: true, outputKey: 'HTTP Reel' },
          { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 }, conditions: [{ leftValue: expr('{{ $json.post_type }}'), rightValue: 'fb_reel', operator: { type: 'string', operation: 'equals' }, id: 'r7' }], combinator: 'and' }, renameOutput: true, outputKey: 'FB Reel' }
        ]
      },
      options: {}
    },
    position: [0, 400]
  }
});

// === CONTAINERS ===
const cIGImg = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Container IG Image',
    parameters: {
      method: 'POST',
      url: expr("{{ 'https://graph.facebook.com/v23.0/' + $json.node + '/media' }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'image_url', value: expr('{{ $json.image_url }}') }, { name: 'caption', value: expr('{{ $json.caption }}') }] },
      options: {}
    },
    position: [400, -200]
  },
  output: [{ json: { id: 'container_123' } }]
});

const cFBImg = node({
  type: 'n8n-nodes-base.facebookGraphApi',
  version: 1,
  config: {
    name: 'Container FB Image',
    parameters: {
      httpRequestMethod: 'POST', graphApiVersion: 'v23.0', node: expr('{{ $json.node }}'), edge: 'media',
      options: { queryParameters: { parameter: [{ name: 'caption', value: expr('{{ $json.caption }}') }, { name: 'image_url', value: expr('{{ $json.image_url }}') }] } }
    },
    position: [400, 0]
  },
  output: [{ json: { id: 'container_123' } }]
});

const cIGStoryImg = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Container IG Story Image',
    parameters: {
      method: 'POST',
      url: expr("{{ 'https://graph.facebook.com/v23.0/' + $json.node + '/media' }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'media_type', value: 'STORIES' }, { name: 'image_url', value: expr('{{ $json.image_url }}') }] },
      options: {}
    },
    position: [400, 200]
  },
  output: [{ json: { id: 'container_123' } }]
});

const cIGStoryVid = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Container IG Story Video',
    parameters: {
      method: 'POST',
      url: expr("{{ 'https://graph.facebook.com/v23.0/' + $json.node + '/media' }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'media_type', value: 'STORIES' }, { name: 'video_url', value: expr('{{ $json.video_url }}') }] },
      options: {}
    },
    position: [400, 400]
  },
  output: [{ json: { id: 'container_123' } }]
});

const cFBStoryImg = node({
  type: 'n8n-nodes-base.facebookGraphApi',
  version: 1,
  config: {
    name: 'Container FB Story Image',
    parameters: {
      httpRequestMethod: 'POST', graphApiVersion: 'v23.0', node: expr('{{ $json.node }}'), edge: 'media',
      options: { queryParameters: { parameter: [{ name: 'caption', value: expr('{{ $json.caption }}') }, { name: 'image_url', value: expr('{{ $json.image_url }}') }, { name: 'media_type', value: 'STORIES' }] } }
    },
    position: [400, 600]
  },
  output: [{ json: { id: 'container_123' } }]
});

const cIGReel = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Container IG Reel',
    parameters: {
      method: 'POST',
      url: expr("{{ 'https://graph.facebook.com/v23.0/' + $json.node + '/media' }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'media_type', value: 'REELS' }, { name: 'video_url', value: expr('{{ $json.video_url }}') }, { name: 'caption', value: expr('{{ $json.caption }}') }, { name: 'cover_url', value: expr('{{ $json.cover_image }}') }] },
      options: {}
    },
    position: [400, 800]
  },
  output: [{ json: { id: 'container_123' } }]
});

const cFBReel = node({
  type: 'n8n-nodes-base.facebookGraphApi',
  version: 1,
  config: {
    name: 'Container FB Reel',
    parameters: {
      httpRequestMethod: 'POST', graphApiVersion: 'v23.0', node: expr('{{ $json.node }}'), edge: 'media',
      options: { queryParameters: { parameter: [{ name: 'video_url', value: expr('{{ $json.video_url }}') }, { name: 'media_type', value: 'REELS' }, { name: 'caption', value: expr('{{ $json.caption }}') }] } }
    },
    position: [400, 1000]
  },
  output: [{ json: { id: 'container_123' } }]
});

// === EXTRACT CONTAINER ID (convergence point) ===
const extractID = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Extract Container ID',
    parameters: {
      assignments: {
        assignments: [
          { id: 'e1', name: 'container_id', value: expr('{{ $json.id }}'), type: 'string' },
          { id: 'e2', name: 'node', value: expr("{{ $('Normalize Input').item.json.node }}"), type: 'string' },
          { id: 'e3', name: 'post_type', value: expr("{{ $('Normalize Input').item.json.post_type }}"), type: 'string' },
          { id: 'e4', name: 'property_id', value: expr("{{ $('Normalize Input').item.json.property_id }}"), type: 'string' },
          { id: 'e5', name: 'schedule_id', value: expr("{{ $('Normalize Input').item.json.schedule_id }}"), type: 'string' }
        ]
      },
      options: {}
    },
    position: [800, 400]
  },
  output: [{ json: { container_id: 'container_123', node: '17841480468406561', post_type: 'http_image', property_id: '', schedule_id: '' } }]
});

// === WAIT + STATUS CHECK ===
const initWait = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Initial Wait',
    parameters: { waitAmount: 10, unit: 'seconds' },
    position: [1000, 400],
    webhookId: 'init-wait-wh-001'
  },
  output: [{ json: { waiting: true } }]
});

const checkStatus = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Check Status',
    parameters: {
      url: expr("{{ 'https://graph.facebook.com/v23.0/' + $json.container_id }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpQueryAuth',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'fields', value: 'status_code' }] },
      options: {}
    },
    position: [1200, 400]
  },
  output: [{ json: { status_code: 'FINISHED' } }]
});

const isReady = ifElse({
  version: 2.2,
  config: {
    name: 'Is Ready?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
        conditions: [{ id: 'ready-check', leftValue: expr('{{ $json.status_code }}'), rightValue: 'FINISHED', operator: { type: 'string', operation: 'equals' } }],
        combinator: 'and'
      },
      options: {}
    },
    position: [1400, 400]
  }
});

const retryWait = node({
  type: 'n8n-nodes-base.wait',
  version: 1.1,
  config: {
    name: 'Retry Wait',
    parameters: { waitAmount: 15, unit: 'seconds' },
    position: [1600, 550],
    webhookId: 'retry-wait-wh-001'
  },
  output: [{ json: { retrying: true } }]
});

// === PUBLISH ROUTER ===
const publishRouter = ifElse({
  version: 2.2,
  config: {
    name: 'HTTPS vs FB Router',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 3 },
        conditions: [{ id: 'http-check', leftValue: expr("{{ $json.post_type.split('_')[0] }}"), rightValue: 'http', operator: { type: 'string', operation: 'equals' } }],
        combinator: 'and'
      },
      options: {}
    },
    position: [1600, 250]
  }
});

const publishHTTPS = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.4,
  config: {
    name: 'Publish via HTTPS',
    parameters: {
      method: 'POST',
      url: expr("{{ 'https://graph.facebook.com/v23.0/' + $json.node + '/media_publish' }}"),
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'creation_id', value: expr('{{ $json.container_id }}') }] },
      options: {}
    },
    position: [1900, 150]
  },
  output: [{ json: { id: 'published_123' } }]
});

const publishFB = node({
  type: 'n8n-nodes-base.facebookGraphApi',
  version: 1,
  config: {
    name: 'Publish via FB SDK',
    parameters: {
      httpRequestMethod: 'POST', graphApiVersion: 'v23.0', node: expr('{{ $json.node }}'), edge: 'media_publish',
      options: { queryParameters: { parameter: [{ name: 'creation_id', value: expr('{{ $json.container_id }}') }] } }
    },
    position: [1900, 400]
  },
  output: [{ json: { id: 'published_123' } }]
});

// === RESPONSE ===
const buildResponse = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Build Response',
    parameters: {
      assignments: {
        assignments: [
          { id: 'resp', name: 'response', value: expr('{{ { "success": true, "published": true, "post_id": $json.id, "post_type": $("Normalize Input").item.json.post_type, "property_id": $("Normalize Input").item.json.property_id, "schedule_id": $("Normalize Input").item.json.schedule_id, "platform": $("Normalize Input").item.json.post_type.startsWith("fb") ? "facebook" : "instagram", "timestamp": $now.toISO() } }}'), type: 'object' }
        ]
      },
      options: {}
    },
    position: [2100, 250]
  },
  output: [{ json: { response: { success: true, published: true, post_id: 'published_123' } } }]
});

const respond = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.2,
  config: {
    name: 'Respond to Webhook',
    parameters: { statusCode: 200, respondWith: 'json', responseBody: expr('{{ $json.response }}'), options: {} },
    position: [2300, 400]
  },
  output: [{ json: { success: true } }]
});

// === STICKY NOTES ===
sticky('## Webhook Trigger\nPOST from DemoRealState backend', [webhook], { color: 3 });
sticky('## Normalize + Auto-Detect\nSets defaults, detects type from data', [normalize], { color: 2 });
sticky('## Content Router\n7 routes: http_image, fb_image, http_story_image, http_story_video, fb_story_image, http_reel, fb_reel', [router], { color: 1 });
sticky('## IG Containers (HTTPS)', [cIGImg, cIGStoryImg, cIGStoryVid, cIGReel], { color: 4 });
sticky('## FB Containers (Graph API)', [cFBImg, cFBStoryImg, cFBReel], { color: 5 });
sticky('## Processing Pipeline\nExtract → Wait → Check → Retry loop', [extractID, initWait, checkStatus, isReady, retryWait], { color: 2 });
sticky('## Publish\nHTTPS for IG, Graph API for FB', [publishRouter, publishHTTPS, publishFB], { color: 4 });
sticky('## Response\nReturns result to backend', [buildResponse, respond], { color: 3 });

// === COMPOSITION ===
export default workflow('9LmYe0JzExMzoGDX', 'IG POST ONLY - Production')
  .add(webhook)
  .to(normalize)
  .to(router
    .onCase(0, cIGImg.to(extractID))
    .onCase(1, cFBImg.to(extractID))
    .onCase(2, cIGStoryImg.to(extractID))
    .onCase(3, cIGStoryVid.to(extractID))
    .onCase(4, cFBStoryImg.to(extractID))
    .onCase(5, cIGReel.to(extractID))
    .onCase(6, cFBReel.to(extractID))
  )
  .add(extractID)
  .to(initWait)
  .to(checkStatus)
  .to(isReady
    .onTrue(publishRouter
      .onTrue(publishHTTPS.to(buildResponse))
      .onFalse(publishFB.to(buildResponse))
    )
    .onFalse(retryWait.to(checkStatus))
  )
  .add(buildResponse)
  .to(respond);
