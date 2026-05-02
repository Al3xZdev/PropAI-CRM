// Document Storage Service
// Supports both Cloudinary and Supabase Storage

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dokudud05',
  api_key: process.env.CLOUDINARY_API_KEY || '163778436428583',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'm0EeQDVVIbloh7iXcxdVlnI8dwY',
  secure: true
});

// Configure Supabase - normalize URL (remove /rest/v1/ if present)
const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

console.log('☁️ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('📦 Supabase configured:', supabase ? 'YES' : 'NO', '- URL:', supabaseUrl);

// ✅ Mapa de extensiones a MIME types reales
const MIME_TYPES = {
  pdf:  'application/pdf',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
};

/**
 * Upload file to specified storage
 * @param {Buffer} buffer - File buffer
 * @param {String} originalName - Original filename
 * @param {String} storage - 'cloudinary' or 'supabase'
 * @returns {Object} - { url, publicId, storage, mimeType, size }
 */
async function uploadDocument(buffer, originalName, storage = 'cloudinary') {
  const ext = originalName.split('.').pop().toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
  
  // ✅ MIME type real desde el mapa, no desde Cloudinary
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  // Try preferred storage, fallback to Cloudinary if fails
  try {
    if (storage === 'supabase') {
      return await uploadToSupabase(buffer, originalName, mimeType);
    }
  } catch (supabaseError) {
    console.warn('⚠️ Supabase upload failed, falling back to Cloudinary:', supabaseError.message);
  }
  
  // Default to Cloudinary - pasar la extensión para el formato
  return uploadToCloudinary(buffer, originalName, mimeType, isImage, ext);
}

/**
 * Upload to Cloudinary
 */
async function uploadToCloudinary(buffer, originalName, mimeType, isImage, ext) {
  return new Promise((resolve, reject) => {
    // ✅ Para imágenes usar 'image', para otros usar 'raw'
    const resourceType = isImage ? 'image' : 'raw';
    
    // ✅ public_id limpio SIN extensión (Cloudinary la maneja con format)
    const baseName = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    const publicId = `${baseName}-${uniqueId}`;

    console.log('   Uploading with public_id:', publicId, 'format:', ext);

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'realestate/documents',
        resource_type: resourceType,
        public_id: publicId,
        // ✅ Forzar extensión correcta en el URL de Cloudinary
        format: ext,
        use_filename: false,
        unique_filename: false,
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log('✅ Document uploaded to Cloudinary:', result.secure_url);
          console.log('   Format:', result.format, 'Resource type:', result.resource_type, 'Public ID:', result.public_id);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            storage: 'cloudinary',
            // ✅ mimeType real, no result.format
            mimeType: mimeType,
            originalName: originalName,
            size: result.bytes,
          });
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/**
 * Upload to Supabase Storage
 */
async function uploadToSupabase(buffer, originalName, mimeType) {
  if (!supabase) {
    throw new Error('Supabase not configured');
  }

  // Generate unique file path
  const timestamp = Date.now();
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `documents/${timestamp}-${safeName}`;
  
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false
    });

  if (error) {
    console.error('❌ Supabase upload error:', error);
    throw error;
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  console.log('✅ Document uploaded to Supabase:', urlData.publicUrl);
  
  return {
    url: urlData.publicUrl,
    publicId: data.path,
    storage: 'supabase',
    mimeType: mimeType,
    size: buffer.length
  };
}

/**
 * Delete document from storage
 */
async function deleteDocument(publicId, storage = 'cloudinary') {
  if (storage === 'supabase') {
    if (!supabase) throw new Error('Supabase not configured');
    
    const { error } = await supabase.storage
      .from('documents')
      .remove([publicId]);
    
    if (error) {
      console.error('❌ Supabase delete error:', error);
      throw error;
    }
    
    console.log('✅ Document deleted from Supabase');
    return true;
  }
  
  // Cloudinary
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        console.error('❌ Cloudinary delete error:', error);
        reject(error);
      } else {
        console.log('✅ Document deleted from Cloudinary');
        resolve(result);
      }
    });
  });
}

/**
 * Test both storage connections
 */
async function testConnections() {
  const results = { cloudinary: false, supabase: false };
  
  // Test Cloudinary
  try {
    await cloudinary.api.ping();
    results.cloudinary = true;
    console.log('✅ Cloudinary connection OK');
  } catch (e) {
    console.log('⚠️ Cloudinary connection failed:', e.message);
  }
  
  // Test Supabase
  if (supabase) {
    try {
      const { data, error } = await supabase.from('tenants').select('id').limit(1);
      results.supabase = !error;
      console.log('✅ Supabase connection OK');
    } catch (e) {
      console.log('⚠️ Supabase connection failed:', e.message);
    }
  }
  
  return results;
}

module.exports = {
  uploadDocument,
  uploadToCloudinary,
  uploadToSupabase,
  deleteDocument,
  testConnections
};