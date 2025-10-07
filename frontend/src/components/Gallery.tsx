interface GalleryProps {
  images: string[];
  distort?: boolean;
}

const Gallery: React.FC<GalleryProps> = ({ images, distort }) => {
  return (
    <div className="flex justify-center gap-10 mt-10">
      {images.map((img, i) => (
        <div
          key={i}
          className={`gallery-item ${distort ? "distorted-images" : ""}`}
        >
          <img src={img} alt={`Galeria ${i + 1}`} />
        </div>
      ))}
    </div>
  );
};

export default Gallery;
