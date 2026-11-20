import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <h4>{site.name}</h4>
          <p>{site.description}</p>
        </div>

        <div>
          <h4>Explore</h4>
          <a href="#story">Our Story</a>
          <a href="#products">Products</a>
          <a href="#gallery">Gallery</a>
          <a href="#news">News</a>
        </div>

        <div>
          <h4>Connect</h4>
          <a href="#contact">Contact</a>
          <a href={site.social.linkedin}>LinkedIn</a>
          <a href={site.social.facebook}>Facebook</a>
          <a href={site.social.instagram}>Instagram</a>
        </div>

        <div>
          <h4>Reach us</h4>
          <p>{site.phone}</p>
          <p>{site.email}</p>
          <p>{site.address}</p>
        </div>
      </div>

      <p className="footer-bottom">
        © {new Date().getFullYear()} {site.name}. All rights reserved.
      </p>
    </footer>
  );
}
