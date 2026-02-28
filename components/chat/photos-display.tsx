"use client"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Camera, 
  ScanLine, 
  ClipboardCheck,
  Box,
  Sparkles,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { 
  HoverJobDetails, 
  HoverJobPhoto, 
  HoverInspection, 
  HoverWireframeImage,
  HoverInstantDesignImage 
} from "@/app/actions/hover"

interface PhotosDisplayProps {
  jobDetails: HoverJobDetails
  scanPhotos: HoverJobPhoto[]
  inspections: HoverInspection[]
  wireframeImages: HoverWireframeImage[]
  instantDesignImages: HoverInstantDesignImage[]
}

// Helper to convert Hover image URLs to our proxy endpoint
function getProxyUrl(url: string | undefined): string {
  if (!url) return ""
  // If it's a Hover URL, proxy it through our API
  if (url.includes("hover.to")) {
    return `/api/hover/image?url=${encodeURIComponent(url)}`
  }
  return url
}

// Photo grid component for displaying a set of photos
function PhotoGrid({ 
  photos, 
  onPhotoClick 
}: { 
  photos: (HoverJobPhoto | HoverWireframeImage | HoverInstantDesignImage)[]
  onPhotoClick: (index: number) => void 
}) {
  if (!photos || photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No photos available</p>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {photos.map((photo, index) => (
        <button
          key={photo.id || index}
          onClick={() => onPhotoClick(index)}
          className="group relative aspect-square overflow-hidden rounded-lg border bg-muted transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2"
        >
          <Image
            src={getProxyUrl(photo.thumbnail_url || photo.url)}
            alt={`Photo ${index + 1}`}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
            <ZoomIn className="size-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </button>
      ))}
    </div>
  )
}

// Lightbox component for viewing photos in full size
function PhotoLightbox({
  photos,
  currentIndex,
  onClose,
  onNavigate,
}: {
  photos: (HoverJobPhoto | HoverWireframeImage | HoverInstantDesignImage)[]
  currentIndex: number
  onClose: () => void
  onNavigate: (direction: "prev" | "next") => void
}) {
  const currentPhoto = photos[currentIndex]
  
  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = getProxyUrl(currentPhoto.url)
    link.download = `photo-${currentPhoto.id || currentIndex}.jpg`
    link.target = "_blank"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-4 top-4 z-10 text-white hover:bg-white/20"
        onClick={onClose}
      >
        <X className="size-6" />
      </Button>

      {/* Download button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-16 top-4 z-10 text-white hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation()
          handleDownload()
        }}
      >
        <Download className="size-6" />
      </Button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate("prev")
          }}
        >
          <ChevronLeft className="size-8" />
        </Button>
      )}

      {currentIndex < photos.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onNavigate("next")
          }}
        >
          <ChevronRight className="size-8" />
        </Button>
      )}

      {/* Photo */}
      <div 
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={getProxyUrl(currentPhoto.url)}
          alt={`Photo ${currentIndex + 1}`}
          width={1200}
          height={800}
          className="max-h-[90vh] w-auto object-contain"
          priority
        />
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-sm text-white">
        {currentIndex + 1} / {photos.length}
      </div>
    </div>
  )
}

// Section component for grouping photos
function PhotoSection({
  title,
  icon: Icon,
  photos,
  allPhotos,
  startIndex,
  onPhotoClick,
}: {
  title: string
  icon: React.ElementType
  photos: (HoverJobPhoto | HoverWireframeImage | HoverInstantDesignImage)[]
  allPhotos: (HoverJobPhoto | HoverWireframeImage | HoverInstantDesignImage)[]
  startIndex: number
  onPhotoClick: (index: number) => void
}) {
  if (!photos || photos.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-muted-foreground" />
        <h3 className="font-medium">{title}</h3>
        <span className="text-sm text-muted-foreground">({photos.length} photos)</span>
      </div>
      <PhotoGrid 
        photos={photos} 
        onPhotoClick={(index) => onPhotoClick(startIndex + index)} 
      />
    </div>
  )
}

export function PhotosDisplay({ 
  jobDetails, 
  scanPhotos, 
  inspections, 
  wireframeImages,
  instantDesignImages 
}: PhotosDisplayProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)

  // Combine all photos into a single array for lightbox navigation
  const allPhotos: (HoverJobPhoto | HoverWireframeImage | HoverInstantDesignImage)[] = [
    ...scanPhotos,
    ...inspections.flatMap(i => i.photos || []),
    ...wireframeImages,
    ...instantDesignImages,
  ]

  // Calculate starting indices for each section
  let currentIndex = 0
  const scanStartIndex = 0
  currentIndex += scanPhotos.length

  const inspectionStartIndices: number[] = []
  for (const inspection of inspections) {
    inspectionStartIndices.push(currentIndex)
    currentIndex += (inspection.photos || []).length
  }

  const wireframeStartIndex = currentIndex
  currentIndex += wireframeImages.length

  const instantDesignStartIndex = currentIndex

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index)
    setLightboxOpen(true)
  }

  const handleNavigate = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(currentPhotoIndex - 1)
    } else if (direction === "next" && currentPhotoIndex < allPhotos.length - 1) {
      setCurrentPhotoIndex(currentPhotoIndex + 1)
    }
  }

  const formatAddress = () => {
    if (!jobDetails.address) return ""
    const { location_line_1, city, region, postal_code } = jobDetails.address
    return [location_line_1, city, region, postal_code].filter(Boolean).join(", ")
  }

  const totalPhotos = allPhotos.length
  const hasAnyPhotos = totalPhotos > 0

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{jobDetails.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{formatAddress()}</p>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="size-5 text-muted-foreground" />
              <span className="text-sm font-medium">{totalPhotos} photos</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!hasAnyPhotos ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No photos available for this job.
            </p>
          ) : (
            <>
              {/* Scan Photos Section */}
              <PhotoSection
                title="Scan Photos"
                icon={ScanLine}
                photos={scanPhotos}
                allPhotos={allPhotos}
                startIndex={scanStartIndex}
                onPhotoClick={handlePhotoClick}
              />

              {/* Inspection Photos Sections */}
              {inspections.map((inspection, idx) => (
                <PhotoSection
                  key={inspection.id}
                  title={`Inspection: ${inspection.title}`}
                  icon={ClipboardCheck}
                  photos={inspection.photos || []}
                  allPhotos={allPhotos}
                  startIndex={inspectionStartIndices[idx]}
                  onPhotoClick={handlePhotoClick}
                />
              ))}

              {/* Wireframe Images Section */}
              <PhotoSection
                title="Sketches"
                icon={Box}
                photos={wireframeImages}
                allPhotos={allPhotos}
                startIndex={wireframeStartIndex}
                onPhotoClick={handlePhotoClick}
              />

              {/* Instant Design Images Section */}
              <PhotoSection
                title="Instant Design Images"
                icon={Sparkles}
                photos={instantDesignImages}
                allPhotos={allPhotos}
                startIndex={instantDesignStartIndex}
                onPhotoClick={handlePhotoClick}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxOpen && allPhotos.length > 0 && (
        <PhotoLightbox
          photos={allPhotos}
          currentIndex={currentPhotoIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={handleNavigate}
        />
      )}
    </>
  )
}

// Loading state component
export function PhotosDisplayLoading() {
  return (
    <Card className="w-full">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading photos...</p>
      </CardContent>
    </Card>
  )
}
